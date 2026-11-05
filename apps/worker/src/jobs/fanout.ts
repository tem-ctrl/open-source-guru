import { and, asc, eq, inArray, isNull } from "@osg/core/db/query";
import {
  deliveries,
  events,
  notificationChannels,
  repositories,
  subscriptionChannels,
  subscriptions,
} from "@osg/core/db/schema";
import { matchesSubscription, needsOpenPrCheck } from "@osg/core/notifications/match";
import type { WorkerContext } from "../context.ts";

const BATCH_SIZE = 500;

const issueKey = (repoId: string, issueNumber: number) => `${repoId}:${issueNumber}`;

/**
 * Asks GitHub about the open PRs of the pending events that depend on them, keyed by `issueKey`.
 * Runs outside the fan-out transaction, since requests can wait a long time on rate limits. A
 * repository that fails is left out: its events wait for the next run, others go ahead.
 */
async function lookUpOpenPrs(ctx: WorkerContext): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  const pending = await ctx.db
    .select()
    .from(events)
    .where(isNull(events.fannedOutAt))
    .orderBy(asc(events.createdAt))
    .limit(BATCH_SIZE);
  if (pending.length === 0) return results;

  const candidates = await ctx.db
    .select({
      repoId: subscriptions.repoId,
      eventTypes: subscriptions.eventTypes,
      labels: subscriptions.labels,
      labelMatch: subscriptions.labelMatch,
      subscribedAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.repoId, [...new Set(pending.map((event) => event.repoId))]),
        eq(subscriptions.status, "active"),
      ),
    );

  const numbersByRepo = new Map<string, Set<number>>();
  for (const event of pending) {
    const needed = candidates.some(
      (subscription) =>
        subscription.repoId === event.repoId &&
        subscription.subscribedAt <= event.createdAt &&
        needsOpenPrCheck(subscription, event),
    );
    if (!needed) continue;
    const numbers = numbersByRepo.get(event.repoId) ?? new Set<number>();
    numbersByRepo.set(event.repoId, numbers.add(event.issueNumber));
  }
  if (numbersByRepo.size === 0) return results;

  const repos = await ctx.db
    .select({ id: repositories.id, owner: repositories.owner, name: repositories.name })
    .from(repositories)
    .where(inArray(repositories.id, [...numbersByRepo.keys()]));
  for (const repo of repos) {
    const numbers = [...(numbersByRepo.get(repo.id) ?? [])];
    try {
      const withOpenPr = await ctx.github.listIssuesWithOpenPrs(repo.owner, repo.name, numbers);
      for (const number of numbers) {
        results.set(issueKey(repo.id, number), withOpenPr.has(number));
      }
    } catch (error) {
      ctx.log.warn(
        { repo: `${repo.owner}/${repo.name}`, error: String(error) },
        "open PR lookup failed; retrying on the next run",
      );
    }
  }
  return results;
}

/**
 * Creates one delivery per (event, subscription, channel) for new events that match active
 * subscriptions. Idempotent: a unique key prevents duplicate deliveries, and
 * events are marked as fanned out in the same transaction. An event whose open PRs are needed
 * but unknown stays pending.
 */
export async function fanOutEvents(
  ctx: WorkerContext,
): Promise<{ events: number; deliveries: number }> {
  const now = ctx.now();
  const openPrs = await lookUpOpenPrs(ctx);
  return ctx.db.transaction(async (tx) => {
    const pending = await tx
      .select()
      .from(events)
      .where(isNull(events.fannedOutAt))
      .orderBy(asc(events.createdAt))
      .limit(BATCH_SIZE)
      .for("update", { skipLocked: true });
    if (pending.length === 0) return { events: 0, deliveries: 0 };

    const repoIds = [...new Set(pending.map((event) => event.repoId))];
    const targets = await tx
      .select({
        subscriptionId: subscriptions.id,
        repoId: subscriptions.repoId,
        eventTypes: subscriptions.eventTypes,
        labels: subscriptions.labels,
        labelMatch: subscriptions.labelMatch,
        subscribedAt: subscriptions.createdAt,
        channelId: subscriptionChannels.channelId,
        frequency: subscriptionChannels.frequency,
      })
      .from(subscriptions)
      .innerJoin(subscriptionChannels, eq(subscriptionChannels.subscriptionId, subscriptions.id))
      .innerJoin(notificationChannels, eq(notificationChannels.id, subscriptionChannels.channelId))
      .where(
        and(
          inArray(subscriptions.repoId, repoIds),
          eq(subscriptions.status, "active"),
          eq(notificationChannels.status, "active"),
        ),
      );

    const ready = pending
      .map((event) => ({
        ...event,
        hasOpenPr: openPrs.get(issueKey(event.repoId, event.issueNumber)),
      }))
      .filter((event) => {
        if (event.hasOpenPr !== undefined) return true;
        return !targets.some(
          (target) =>
            target.repoId === event.repoId &&
            target.subscribedAt <= event.createdAt &&
            needsOpenPrCheck(target, event),
        );
      });

    const rows = ready.flatMap((event) =>
      targets
        .filter(
          (target) =>
            target.repoId === event.repoId &&
            // Subscribing doesn't replay events detected before the subscription existed.
            target.subscribedAt <= event.createdAt &&
            matchesSubscription(target, event),
        )
        .map((target) => ({
          eventId: event.id,
          subscriptionId: target.subscriptionId,
          channelId: target.channelId,
          frequency: target.frequency,
          // Timestamps come from the job's clock, like every time comparison in the jobs.
          createdAt: now,
          nextAttemptAt: now,
        })),
    );

    const inserted =
      rows.length === 0
        ? []
        : await tx
            .insert(deliveries)
            .values(rows)
            .onConflictDoNothing()
            .returning({ id: deliveries.id });

    if (ready.length > 0) {
      await tx
        .update(events)
        .set({ fannedOutAt: now })
        .where(
          inArray(
            events.id,
            ready.map((event) => event.id),
          ),
        );
    }

    return { events: ready.length, deliveries: inserted.length };
  });
}
