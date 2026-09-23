import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import z from 'zod';

@Injectable()
export class AnalyticsTool implements AgentToolInterface {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService
  ) {}
  name = 'analyticsTool';

  run() {
    return createTool({
      id: 'analyticsTool',
      description: `Fetch analytics from connected social APIs for a channel (integration id) or for a specific post.
Use integrationList to get channel ids. date is the lookback window in days (7, 30 or 90).
Returns the same metrics Postiz shows in Analíticas (impressions, reach, likes, followers, etc.).`,
      inputSchema: z.object({
        integrationId: z
          .string()
          .optional()
          .describe('Channel (integration) id from integrationList'),
        postId: z
          .string()
          .optional()
          .describe('Optional post id for per-post analytics'),
        date: z
          .number()
          .optional()
          .describe('Lookback days: 7, 30 or 90 (default 7)'),
      }),
      mcp: {
        annotations: {
          title: 'Analytics',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      outputSchema: z.object({
        output: z.any(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const org = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        );
        const days = inputData.date || 7;

        if (inputData.postId) {
          const data = await this._postsService.checkPostAnalytics(
            org.id,
            inputData.postId,
            days
          );
          return { output: data };
        }

        if (!inputData.integrationId) {
          return {
            output: {
              error:
                'Pass integrationId (channel) or postId. Use integrationList / postsListTool first.',
            },
          };
        }

        const data = await this._integrationService.checkAnalytics(
          org,
          inputData.integrationId,
          String(days)
        );
        return { output: data };
      },
    });
  }
}
