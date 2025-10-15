import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'mocha';
import {
  buildQuery,
  helpMessage,
  main,
  processResults,
  type QueryResult,
  type Results,
} from '../src/index.js';

describe('promotime', () => {
  describe('buildQuery', () => {
    it('should build a basic query with just username', () => {
      const query = buildQuery('testuser');
      assert.strictEqual(
        query,
        "SELECT * FROM `githubarchive.month.*` WHERE actor.login='testuser'",
      );
    });

    it('should build a query with username and start date', () => {
      const query = buildQuery('testuser', '2020-01-01');
      assert.strictEqual(
        query,
        "SELECT * FROM `githubarchive.month.*` WHERE actor.login='testuser' AND created_at > '2020-01-01'",
      );
    });

    it('should build a query with username and end date', () => {
      const query = buildQuery('testuser', undefined, '2020-12-31');
      assert.strictEqual(
        query,
        "SELECT * FROM `githubarchive.month.*` WHERE actor.login='testuser' AND created_at < '2020-12-31'",
      );
    });

    it('should build a query with username, start date, and end date', () => {
      const query = buildQuery('testuser', '2020-01-01', '2020-12-31');
      assert.strictEqual(
        query,
        "SELECT * FROM `githubarchive.month.*` WHERE actor.login='testuser' AND created_at > '2020-01-01' AND created_at < '2020-12-31'",
      );
    });

    it('should handle special characters in username', () => {
      const query = buildQuery('test-user_123');
      assert.strictEqual(
        query,
        "SELECT * FROM `githubarchive.month.*` WHERE actor.login='test-user_123'",
      );
    });
  });

  describe('processResults', () => {
    it('should count pull requests created', () => {
      const data: QueryResult[] = [
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'closed' }),
        },
      ];

      const results = processResults(data);
      assert.strictEqual(results.pullRequestsCreated, 2);
    });

    it('should count pull request comments', () => {
      const data: QueryResult[] = [
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
      ];

      const results = processResults(data);
      assert.strictEqual(results.pullRequestCommentsMade, 3);
    });

    it('should count issues closed', () => {
      const data: QueryResult[] = [
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'opened' }) },
      ];

      const results = processResults(data);
      assert.strictEqual(results.issuesClosed, 2);
    });

    it('should handle mixed event types', () => {
      const data: QueryResult[] = [
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
      ];

      const results = processResults(data);
      assert.strictEqual(results.pullRequestsCreated, 2);
      assert.strictEqual(results.pullRequestCommentsMade, 2);
      assert.strictEqual(results.issuesClosed, 3);
    });

    it('should return zero counts for empty data', () => {
      const data: QueryResult[] = [];
      const results = processResults(data);
      assert.strictEqual(results.pullRequestsCreated, 0);
      assert.strictEqual(results.pullRequestCommentsMade, 0);
      assert.strictEqual(results.issuesClosed, 0);
    });

    it('should ignore irrelevant event types', () => {
      const data: QueryResult[] = [
        { type: 'PushEvent', payload: '{}' },
        { type: 'WatchEvent', payload: '{}' },
        { type: 'ForkEvent', payload: '{}' },
      ];

      const results = processResults(data);
      assert.strictEqual(results.pullRequestsCreated, 0);
      assert.strictEqual(results.pullRequestCommentsMade, 0);
      assert.strictEqual(results.issuesClosed, 0);
    });

    it('should handle PullRequestEvent with non-opened action', () => {
      const data: QueryResult[] = [
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'closed' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'reopened' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'synchronize' }),
        },
      ];

      const results = processResults(data);
      assert.strictEqual(results.pullRequestsCreated, 0);
    });

    it('should handle IssuesEvent with non-closed action', () => {
      const data: QueryResult[] = [
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'opened' }) },
        {
          type: 'IssuesEvent',
          payload: JSON.stringify({ action: 'reopened' }),
        },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'edited' }) },
      ];

      const results = processResults(data);
      assert.strictEqual(results.issuesClosed, 0);
    });

    it('should handle large datasets', () => {
      const data: QueryResult[] = [];
      for (let i = 0; i < 1000; i++) {
        data.push({
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        });
      }

      const results = processResults(data);
      assert.strictEqual(results.pullRequestsCreated, 1000);
    });

    it('should handle data with all result types populated', () => {
      const data: QueryResult[] = [
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
      ];

      const results = processResults(data);
      assert.strictEqual(results.pullRequestsCreated, 1);
      assert.strictEqual(results.pullRequestCommentsMade, 1);
      assert.strictEqual(results.issuesClosed, 1);
      assert.strictEqual(results.codeReviewsCompleted, undefined);
    });
  });

  describe('helpMessage', () => {
    it('should contain usage information', () => {
      assert.ok(helpMessage.includes('Usage'));
      assert.ok(helpMessage.includes('promotime'));
      assert.ok(helpMessage.includes('GITHUB_USERNAME'));
    });

    it('should contain flag information', () => {
      assert.ok(helpMessage.includes('--start'));
      assert.ok(helpMessage.includes('--end'));
      assert.ok(helpMessage.includes('--help'));
    });

    it('should contain examples', () => {
      assert.ok(helpMessage.includes('Examples'));
      assert.ok(helpMessage.includes('JustinBeckwith'));
    });

    it('should contain date format information', () => {
      assert.ok(helpMessage.includes('YYYY-MM-DDDD'));
    });
  });

  describe('Types', () => {
    it('should have correct Results type structure', () => {
      const results: Results = {
        pullRequestsCreated: 5,
        codeReviewsCompleted: 3,
        issuesClosed: 2,
        pullRequestCommentsMade: 10,
      };
      assert.strictEqual(typeof results.pullRequestsCreated, 'number');
      assert.strictEqual(typeof results.codeReviewsCompleted, 'number');
      assert.strictEqual(typeof results.issuesClosed, 'number');
      assert.strictEqual(typeof results.pullRequestCommentsMade, 'number');
    });

    it('should allow Results with partial properties', () => {
      const results: Results = {
        pullRequestsCreated: 5,
      };
      assert.strictEqual(results.pullRequestsCreated, 5);
      assert.strictEqual(results.codeReviewsCompleted, undefined);
    });

    it('should allow empty Results object', () => {
      const results: Results = {};
      assert.strictEqual(typeof results, 'object');
    });
  });

  describe('main', () => {
    describe('CLI integration', () => {
      let originalArgv: string[];

      beforeEach(() => {
        originalArgv = process.argv;
      });

      afterEach(() => {
        process.argv = originalArgv;
      });

      it('should parse username from CLI arguments', async () => {
        process.argv = ['node', 'promotime', 'testuser'];

        const mockData: QueryResult[] = [
          {
            type: 'PullRequestEvent',
            payload: JSON.stringify({ action: 'opened' }),
          },
        ];

        const mockQueryFn = async (_query: string) => mockData;

        // Override queryFn after CLI parsing by calling with empty options
        // but we need to let it parse CLI first, then inject queryFn
        // This is tricky - we need to pass queryFn in options but not username
        const results = await main({ queryFn: mockQueryFn });

        assert.strictEqual(results?.pullRequestsCreated, 1);
      });

      it('should parse username and start date from CLI', async () => {
        process.argv = [
          'node',
          'promotime',
          'testuser',
          '--start',
          '2020-01-01',
        ];

        let capturedQuery = '';
        const mockQueryFn = async (query: string) => {
          capturedQuery = query;
          return [];
        };

        await main({ queryFn: mockQueryFn });

        assert.ok(capturedQuery.includes("actor.login='testuser'"));
        assert.ok(capturedQuery.includes("created_at > '2020-01-01'"));
      });

      it('should parse username and end date from CLI', async () => {
        process.argv = ['node', 'promotime', 'testuser', '--end', '2020-12-31'];

        let capturedQuery = '';
        const mockQueryFn = async (query: string) => {
          capturedQuery = query;
          return [];
        };

        await main({ queryFn: mockQueryFn });

        assert.ok(capturedQuery.includes("actor.login='testuser'"));
        assert.ok(capturedQuery.includes("created_at < '2020-12-31'"));
      });

      it('should parse username with both start and end dates from CLI', async () => {
        process.argv = [
          'node',
          'promotime',
          'testuser',
          '--start',
          '2020-01-01',
          '--end',
          '2020-12-31',
        ];

        let capturedQuery = '';
        const mockQueryFn = async (query: string) => {
          capturedQuery = query;
          return [];
        };

        await main({ queryFn: mockQueryFn });

        assert.ok(capturedQuery.includes("actor.login='testuser'"));
        assert.ok(capturedQuery.includes("created_at > '2020-01-01'"));
        assert.ok(capturedQuery.includes("created_at < '2020-12-31'"));
      });

      it('should show help and return undefined when no username provided', async () => {
        process.argv = ['node', 'promotime'];

        // Mock process.exit to prevent test termination
        const originalExit = process.exit;
        let exitCalled = false;
        (process.exit as unknown) = ((code?: number) => {
          exitCalled = true;
          throw new Error(`process.exit called with code ${code}`);
        }) as typeof process.exit;

        // Mock console.log to capture help output
        const originalLog = console.log;
        let helpShown = false;
        console.log = (...args: unknown[]) => {
          const message = args.join(' ');
          if (message.includes('Usage') || message.includes('promotime')) {
            helpShown = true;
          }
        };

        try {
          const result = await main({});
          // If we get here without exit being called, result should be undefined
          assert.strictEqual(result, undefined);
        } catch (error) {
          // process.exit was called, which is expected
          assert.ok(
            exitCalled || (error as Error).message.includes('process.exit'),
          );
        } finally {
          console.log = originalLog;
          process.exit = originalExit;
        }

        assert.ok(
          helpShown,
          'Help message should have been displayed to console',
        );
      });

      it('should show help when multiple usernames provided', async () => {
        process.argv = ['node', 'promotime', 'user1', 'user2'];

        // Mock process.exit to prevent test termination
        const originalExit = process.exit;
        let exitCalled = false;
        (process.exit as unknown) = ((code?: number) => {
          exitCalled = true;
          throw new Error(`process.exit called with code ${code}`);
        }) as typeof process.exit;

        const originalLog = console.log;
        let helpShown = false;
        console.log = (...args: unknown[]) => {
          const message = args.join(' ');
          if (message.includes('Usage') || message.includes('promotime')) {
            helpShown = true;
          }
        };

        try {
          const result = await main({});
          assert.strictEqual(result, undefined);
        } catch (error) {
          // process.exit was called, which is expected
          assert.ok(
            exitCalled || (error as Error).message.includes('process.exit'),
          );
        } finally {
          console.log = originalLog;
          process.exit = originalExit;
        }

        assert.ok(helpShown, 'Help should be shown for multiple usernames');
      });
    });

    it('should process results with mocked query function', async () => {
      const mockData: QueryResult[] = [
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
      ];

      const mockQueryFn = async (_query: string) => mockData;

      const results = await main({
        username: 'testuser',
        queryFn: mockQueryFn,
      });

      assert.strictEqual(results?.pullRequestsCreated, 2);
      assert.strictEqual(results?.pullRequestCommentsMade, 1);
      assert.strictEqual(results?.issuesClosed, 1);
    });

    it('should build query with start date', async () => {
      const mockData: QueryResult[] = [];
      let capturedQuery = '';

      const mockQueryFn = async (query: string) => {
        capturedQuery = query;
        return mockData;
      };

      await main({
        username: 'testuser',
        startDate: '2020-01-01',
        queryFn: mockQueryFn,
      });

      assert.ok(capturedQuery.includes("actor.login='testuser'"));
      assert.ok(capturedQuery.includes("created_at > '2020-01-01'"));
    });

    it('should build query with end date', async () => {
      const mockData: QueryResult[] = [];
      let capturedQuery = '';

      const mockQueryFn = async (query: string) => {
        capturedQuery = query;
        return mockData;
      };

      await main({
        username: 'testuser',
        endDate: '2020-12-31',
        queryFn: mockQueryFn,
      });

      assert.ok(capturedQuery.includes("actor.login='testuser'"));
      assert.ok(capturedQuery.includes("created_at < '2020-12-31'"));
    });

    it('should build query with both start and end dates', async () => {
      const mockData: QueryResult[] = [];
      let capturedQuery = '';

      const mockQueryFn = async (query: string) => {
        capturedQuery = query;
        return mockData;
      };

      await main({
        username: 'testuser',
        startDate: '2020-01-01',
        endDate: '2020-12-31',
        queryFn: mockQueryFn,
      });

      assert.ok(capturedQuery.includes("actor.login='testuser'"));
      assert.ok(capturedQuery.includes("created_at > '2020-01-01'"));
      assert.ok(capturedQuery.includes("created_at < '2020-12-31'"));
    });

    it('should handle empty query results', async () => {
      const mockData: QueryResult[] = [];

      const mockQueryFn = async (_query: string) => mockData;

      const results = await main({
        username: 'testuser',
        queryFn: mockQueryFn,
      });

      assert.strictEqual(results?.pullRequestsCreated, 0);
      assert.strictEqual(results?.pullRequestCommentsMade, 0);
      assert.strictEqual(results?.issuesClosed, 0);
    });

    it('should handle complex real-world data', async () => {
      const mockData: QueryResult[] = [
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'opened' }),
        },
        {
          type: 'PullRequestEvent',
          payload: JSON.stringify({ action: 'closed' }),
        },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'PullRequestReviewCommentEvent', payload: '{}' },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'closed' }) },
        { type: 'IssuesEvent', payload: JSON.stringify({ action: 'opened' }) },
        { type: 'PushEvent', payload: '{}' },
        { type: 'WatchEvent', payload: '{}' },
      ];

      const mockQueryFn = async (_query: string) => mockData;

      const results = await main({
        username: 'JustinBeckwith',
        startDate: '2020-01-01',
        endDate: '2020-12-31',
        queryFn: mockQueryFn,
      });

      assert.strictEqual(results?.pullRequestsCreated, 3);
      assert.strictEqual(results?.pullRequestCommentsMade, 5);
      assert.strictEqual(results?.issuesClosed, 2);
    });

    it('should call queryFn with correct query', async () => {
      const mockData: QueryResult[] = [];
      let queryFnCalled = false;

      const mockQueryFn = async (query: string) => {
        queryFnCalled = true;
        assert.ok(query.includes('SELECT * FROM'));
        assert.ok(query.includes('githubarchive.month.*'));
        return mockData;
      };

      await main({
        username: 'testuser',
        queryFn: mockQueryFn,
      });

      assert.strictEqual(queryFnCalled, true);
    });
  });
});
