#!/usr/bin/env tsx

/**
 * Dashboard Metrics Fix Utility
 * 
 * Command-line utility to diagnose and fix dashboard metrics sync issues
 * 
 * Usage:
 *   npm run dashboard-fix -- --help
 *   npm run dashboard-fix -- --check
 *   npm run dashboard-fix -- --fix-user USER_ID
 *   npm run dashboard-fix -- --reconcile --dry-run
 *   npm run dashboard-fix -- --reconcile --max-sessions 50
 */

import { Command } from 'commander';
import { 
  checkSessionTypeIntegrity, 
  validateUserDashboardIntegrity 
} from '../src/lib/database/session-type-integrity';
import { 
  reconcileSessionMetrics, 
  getReconciliationStats 
} from '../src/lib/jobs/metrics-reconciliation';

const program = new Command();

program
  .name('dashboard-metrics-fix')
  .description('Fix dashboard metrics sync issues')
  .version('1.0.0');

program
  .command('check')
  .description('Check session type integrity and metrics reconciliation status')
  .option('-u, --user <userId>', 'Check specific user only')
  .option('--limit <number>', 'Limit number of sessions to check', '100')
  .action(async (options) => {
    console.log('🔍 Checking dashboard metrics status...\n');
    
    try {
      // Check session type integrity
      console.log('📊 Session Type Integrity Check:');
      const integrityReport = await checkSessionTypeIntegrity(options.user, {
        autoFix: false,
        dryRun: true,
        limit: parseInt(options.limit)
      });
      
      console.log(`✅ Correct sessions: ${integrityReport.correctSessions}/${integrityReport.totalSessions}`);
      console.log(`❌ Incorrect sessions: ${integrityReport.incorrectSessions}`);
      console.log(`⚠️  Null sessionTypes: ${integrityReport.nullSessionTypes}`);
      console.log(`📈 Accuracy: ${Math.round((integrityReport.correctSessions / integrityReport.totalSessions) * 100)}%\n`);
      
      if (integrityReport.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        integrityReport.recommendations.forEach(rec => console.log(`   • ${rec}`));
        console.log();
      }

      // Check metrics reconciliation status
      console.log('📈 Metrics Reconciliation Status:');
      const reconciliationStats = await getReconciliationStats(options.user);
      
      console.log(`✅ Sessions with metrics: ${reconciliationStats.sessionsWithMetrics}/${reconciliationStats.completedSessions}`);
      console.log(`❌ Sessions missing metrics: ${reconciliationStats.sessionsMissingMetrics}`);
      console.log(`📊 Completion: ${reconciliationStats.percentageComplete}%\n`);
      
      console.log('🎯 By Therapy Type:');
      Object.entries(reconciliationStats.byTherapyType).forEach(([type, stats]) => {
        const percentage = stats.total > 0 ? Math.round((stats.withMetrics / stats.total) * 100) : 100;
        console.log(`   ${type.toUpperCase()}: ${stats.withMetrics}/${stats.total} (${percentage}%)`);
      });
      console.log();

      // Overall assessment
      if (integrityReport.incorrectSessions === 0 && reconciliationStats.sessionsMissingMetrics === 0) {
        console.log('🎉 Dashboard metrics are fully synchronized!');
      } else {
        console.log('⚠️  Issues detected. Run with --fix to resolve.');
        console.log('\nQuick fix commands:');
        if (integrityReport.incorrectSessions > 0) {
          console.log('   npm run dashboard-fix -- fix-types --dry-run');
        }
        if (reconciliationStats.sessionsMissingMetrics > 0) {
          console.log('   npm run dashboard-fix -- reconcile --dry-run');
        }
      }

    } catch (error) {
      console.error('❌ Check failed:', error);
      process.exit(1);
    }
  });

program
  .command('fix-types')
  .description('Fix session type inconsistencies')
  .option('-u, --user <userId>', 'Fix specific user only')
  .option('--dry-run', 'Show what would be fixed without making changes', false)
  .option('--limit <number>', 'Limit number of sessions to process', '200')
  .action(async (options) => {
    const action = options.dryRun ? 'Previewing' : 'Fixing';
    console.log(`🔧 ${action} session type inconsistencies...\n`);
    
    try {
      const result = await checkSessionTypeIntegrity(options.user, {
        autoFix: !options.dryRun,
        dryRun: options.dryRun,
        limit: parseInt(options.limit)
      });
      
      console.log(`📊 Results:`);
      console.log(`   Total sessions: ${result.totalSessions}`);
      console.log(`   Correct: ${result.correctSessions}`);
      console.log(`   Incorrect: ${result.incorrectSessions}`);
      console.log(`   Null types: ${result.nullSessionTypes}`);
      
      if (result.mismatches.length > 0) {
        console.log(`\n🔍 Mismatches found:`);
        result.mismatches.slice(0, 5).forEach(mismatch => {
          console.log(`   ${mismatch.sessionId}: ${mismatch.currentType || 'null'} → ${mismatch.expectedType} (${mismatch.confidence})`);
        });
        if (result.mismatches.length > 5) {
          console.log(`   ... and ${result.mismatches.length - 5} more`);
        }
      }
      
      if (options.dryRun) {
        console.log(`\n💡 Run without --dry-run to apply fixes`);
      } else {
        console.log(`\n✅ Session type fixes applied`);
      }

    } catch (error) {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    }
  });

program
  .command('reconcile')
  .description('Reconcile missing dashboard metrics')
  .option('-u, --user <userId>', 'Reconcile specific user only')
  .option('--dry-run', 'Show what would be reconciled without making changes', false)
  .option('--batch-size <number>', 'Batch size for processing', '10')
  .option('--max-sessions <number>', 'Maximum sessions to process', '500')
  .action(async (options) => {
    const action = options.dryRun ? 'Previewing' : 'Running';
    console.log(`📈 ${action} metrics reconciliation...\n`);
    
    try {
      const result = await reconcileSessionMetrics({
        userId: options.user,
        batchSize: parseInt(options.batchSize),
        maxSessions: parseInt(options.maxSessions),
        dryRun: options.dryRun,
        skipRecentSessions: true,
        onProgress: (progress) => {
          if (progress.processedSessions % 20 === 0 || progress.processedSessions === progress.totalSessions) {
            const percentage = Math.round((progress.processedSessions / progress.totalSessions) * 100);
            console.log(`   Progress: ${progress.processedSessions}/${progress.totalSessions} (${percentage}%)`);
          }
        }
      });
      
      console.log(`\n📊 Results:`);
      console.log(`   Total sessions: ${result.summary.totalSessions}`);
      console.log(`   Successful: ${result.summary.successfulSessions}`);
      console.log(`   Failed: ${result.summary.failedSessions}`);
      console.log(`   Duration: ${Math.round(result.duration / 1000)}s`);
      
      if (result.summary.errors.length > 0) {
        console.log(`\n❌ Errors (showing first 3):`);
        result.summary.errors.slice(0, 3).forEach(error => {
          console.log(`   ${error.sessionId}: ${error.error}`);
        });
      }
      
      if (result.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        result.recommendations.forEach(rec => console.log(`   • ${rec}`));
      }
      
      if (options.dryRun) {
        console.log(`\n💡 Run without --dry-run to apply changes`);
      } else {
        console.log(`\n✅ Metrics reconciliation completed`);
      }

    } catch (error) {
      console.error('❌ Reconciliation failed:', error);
      process.exit(1);
    }
  });

program
  .command('validate-user')
  .description('Validate dashboard integrity for a specific user')
  .argument('<userId>', 'User ID to validate')
  .action(async (userId) => {
    console.log(`🔍 Validating dashboard integrity for user ${userId}...\n`);
    
    try {
      const validation = await validateUserDashboardIntegrity(userId);
      
      if (validation.isValid) {
        console.log('✅ User dashboard integrity is valid');
      } else {
        console.log('❌ Dashboard integrity issues found:');
        validation.issues.forEach(issue => console.log(`   • ${issue}`));
      }
      
      console.log(`\n📊 Session Counts by Type:`);
      Object.entries(validation.sessionsCount).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} sessions`);
      });
      
      console.log(`\n📈 Metrics Counts by Type:`);
      Object.entries(validation.metricsCount).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} metrics`);
      });

    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

program.parse();