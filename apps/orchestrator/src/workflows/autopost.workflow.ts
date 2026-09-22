import { proxyActivities, sleep } from '@temporalio/workflow';
import { AutopostActivity } from '@gitroom/orchestrator/activities/autopost.activity';

const { autoPost } = proxyActivities<AutopostActivity>({
  startToCloseTimeout: '1 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 1,
  },
});

/** CNS: autopost disabled — workflow idles and never calls the RSS/AI path. */
export async function autoPostWorkflow({
  id,
  immediately,
}: {
  id: string;
  immediately: boolean;
}) {
  // Keep workflow registered for old IDs; do not run autopost logic.
  while (true) {
    void id;
    void immediately;
    void autoPost;
    await sleep('24 hours');
  }
}
