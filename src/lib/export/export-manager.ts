// @ts-nocheck
// src/lib/export/export-manager.ts
"use client";

import { format } from 'date-fns';
import type { 
  EnhancedMetricData, 
  MetricInsight, 
  CommunicationPattern,
  Milestone,
  Recommendation,
  HabitData,
  ProgressSummary
} from '@/lib/enhanced-metrics/types';

export type ExportFormat = 'json' | 'csv' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeMetrics?: boolean;
  includeInsights?: boolean;
  includePatterns?: boolean;
  includeMilestones?: boolean;
  includeRecommendations?: boolean;
  includeHabits?: boolean;
  includeCharts?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  customTitle?: string;
  customDescription?: string;
}

export interface ExportData {
  metadata: {
    generatedAt: string;
    userId: string;
    userName?: string;
    dateRange: {
      start: string;
      end: string;
      period: string;
    };
    exportVersion: string;
  };
  summary: ProgressSummary;
  metrics: EnhancedMetricData[];
  insights: MetricInsight[];
  patterns: CommunicationPattern[];
  milestones: Milestone[];
  recommendations: Recommendation[];
  habits: HabitData[];
  charts?: {
    progressChart?: any[];
    patternsChart?: any[];
    habitsChart?: any[];
  };
}

export class ExportManager {
  private static instance: ExportManager;
  
  static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager();
    }
    return ExportManager.instance;
  }

  // ========================================
  // EXPORT METHODS
  // ========================================

  async exportData(
    data: ExportData,
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    onProgress?.(0);

    switch (options.format) {
      case 'json':
        return this.exportJSON(data, options, onProgress);
      case 'csv':
        return this.exportCSV(data, options, onProgress);
      case 'pdf':
        return this.exportPDF(data, options, onProgress);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  // ========================================
  // JSON EXPORT
  // ========================================

  private async exportJSON(
    data: ExportData,
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    onProgress?.(10);

    const exportData: any = {
      metadata: data.metadata,
      summary: data.summary
    };

    if (options.includeMetrics !== false) {
      exportData.metrics = data.metrics;
      onProgress?.(25);
    }

    if (options.includeInsights !== false) {
      exportData.insights = data.insights;
      onProgress?.(40);
    }

    if (options.includePatterns !== false) {
      exportData.patterns = data.patterns;
      onProgress?.(55);
    }

    if (options.includeMilestones !== false) {
      exportData.milestones = data.milestones;
      onProgress?.(70);
    }

    if (options.includeRecommendations !== false) {
      exportData.recommendations = data.recommendations;
      onProgress?.(85);
    }

    if (options.includeHabits !== false) {
      exportData.habits = data.habits;
      onProgress?.(95);
    }

    if (options.includeCharts !== false && data.charts) {
      exportData.charts = data.charts;
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    onProgress?.(100);

    return new Blob([jsonString], { type: 'application/json' });
  }

  // ========================================
  // CSV EXPORT
  // ========================================

  private async exportCSV(
    data: ExportData,
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    onProgress?.(10);
    
    const csvSections: string[] = [];

    // Metadata section
    csvSections.push('THERAPY PROGRESS REPORT');
    csvSections.push(`Generated: ${data.metadata.generatedAt}`);
    csvSections.push(`Period: ${data.metadata.dateRange.period}`);
    csvSections.push(`Date Range: ${data.metadata.dateRange.start} to ${data.metadata.dateRange.end}`);
    csvSections.push('');

    // Summary section
    if (data.summary) {
      csvSections.push('SUMMARY');
      csvSections.push(`Overall Progress: ${data.summary.overallProgress}%`);
      csvSections.push(`Sessions Completed: ${data.summary.sessionsCompleted}`);
      csvSections.push(`Average Session Rating: ${data.summary.averageSessionRating}/5`);
      csvSections.push(`Current Streak: ${data.summary.currentStreak} days`);
      csvSections.push(`Improvement Rate: ${data.summary.improvementRate}%`);
      csvSections.push('');
    }

    onProgress?.(25);

    // Metrics section
    if (options.includeMetrics !== false && data.metrics.length > 0) {
      csvSections.push('COMMUNICATION METRICS');
      csvSections.push('Metric,Current Value,Previous Value,Trend,Confidence,Source');
      
      data.metrics.forEach(metric => {
        csvSections.push([
          metric.name,
          metric.value.toFixed(2),
          metric.previousValue?.toFixed(2) || 'N/A',
          metric.trend || 'stable',
          `${(metric.confidence * 100).toFixed(0)}%`,
          metric.source
        ].join(','));
      });
      csvSections.push('');
    }

    onProgress?.(40);

    // Insights section
    if (options.includeInsights !== false && data.insights.length > 0) {
      csvSections.push('AI INSIGHTS');
      csvSections.push('Type,Title,Description,Impact,Confidence');
      
      data.insights.forEach(insight => {
        csvSections.push([
          insight.type,
          `"${insight.title}"`,
          `"${insight.description}"`,
          insight.impact,
          `${(insight.confidence * 100).toFixed(0)}%`
        ].join(','));
      });
      csvSections.push('');
    }

    onProgress?.(55);

    // Patterns section
    if (options.includePatterns !== false && data.patterns.length > 0) {
      csvSections.push('COMMUNICATION PATTERNS');
      csvSections.push('Pattern,Frequency,Impact,First Detected,Last Detected');
      
      data.patterns.forEach(pattern => {
        csvSections.push([
          `"${pattern.name}"`,
          pattern.frequency,
          pattern.impact,
          pattern.firstDetected,
          pattern.lastDetected
        ].join(','));
      });
      csvSections.push('');
    }

    onProgress?.(70);

    // Milestones section
    if (options.includeMilestones !== false && data.milestones.length > 0) {
      csvSections.push('MILESTONES & ACHIEVEMENTS');
      csvSections.push('Title,Type,Progress,Status,Unlocked Date');
      
      data.milestones.forEach(milestone => {
        csvSections.push([
          `"${milestone.title}"`,
          milestone.type,
          `${milestone.progress}%`,
          milestone.unlockedAt ? 'Unlocked' : 'Locked',
          milestone.unlockedAt || 'N/A'
        ].join(','));
      });
      csvSections.push('');
    }

    onProgress?.(85);

    // Recommendations section
    if (options.includeRecommendations !== false && data.recommendations.length > 0) {
      csvSections.push('RECOMMENDATIONS');
      csvSections.push('Title,Category,Priority,Impact');
      
      data.recommendations.forEach(rec => {
        csvSections.push([
          `"${rec.title}"`,
          rec.category,
          rec.priority,
          rec.impact
        ].join(','));
      });
      csvSections.push('');
    }

    onProgress?.(95);

    const csvContent = csvSections.join('\n');
    onProgress?.(100);

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  }

  // ========================================
  // PDF EXPORT
  // ========================================

  private async exportPDF(
    data: ExportData,
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    onProgress?.(10);

    // Dynamic import to avoid SSR issues
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(139, 92, 246); // Purple
    doc.text(options.customTitle || 'Therapy Progress Report', 20, yPosition);
    yPosition += 15;

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(data.metadata.generatedAt), 'PPP')}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Period: ${data.metadata.dateRange.period}`, 20, yPosition);
    yPosition += 10;

    onProgress?.(25);

    // Summary Box
    if (data.summary) {
      doc.setFillColor(249, 250, 251); // Light gray
      doc.roundedRect(20, yPosition, 170, 40, 3, 3, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(30);
      doc.text('Progress Summary', 25, yPosition + 10);
      
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Overall Progress: ${data.summary.overallProgress}%`, 25, yPosition + 20);
      doc.text(`Sessions Completed: ${data.summary.sessionsCompleted}`, 100, yPosition + 20);
      doc.text(`Average Rating: ${data.summary.averageSessionRating}/5`, 25, yPosition + 30);
      doc.text(`Current Streak: ${data.summary.currentStreak} days`, 100, yPosition + 30);
      
      yPosition += 50;
    }

    onProgress?.(40);

    // Metrics Chart
    if (options.includeMetrics !== false && data.metrics.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(30);
      doc.text('Communication Metrics', 20, yPosition);
      yPosition += 10;

      const metricsData = data.metrics.map(m => [
        m.name,
        m.value.toFixed(1),
        m.previousValue?.toFixed(1) || '-',
        m.trend || 'stable',
        `${(m.confidence * 100).toFixed(0)}%`
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [['Metric', 'Current', 'Previous', 'Trend', 'Confidence']],
        body: metricsData,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 20, right: 20 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    onProgress?.(55);

    // Check for page break
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // AI Insights
    if (options.includeInsights !== false && data.insights.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(30);
      doc.text('AI-Generated Insights', 20, yPosition);
      yPosition += 10;

      data.insights.slice(0, 5).forEach((insight, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Insight box
        const boxHeight = 25;
        const bgColor = insight.type === 'strength' ? [236, 253, 245] : // Green
                       insight.type === 'improvement' ? [254, 243, 199] : // Yellow
                       insight.type === 'warning' ? [254, 226, 226] : // Red
                       [243, 244, 246]; // Gray
        doc.setFillColor(...bgColor);
        doc.roundedRect(20, yPosition, 170, boxHeight, 2, 2, 'F');

        // Icon based on type
        const iconColor = 
          insight.type === 'strength' ? [16, 185, 129] :
          insight.type === 'improvement' ? [245, 158, 11] :
          insight.type === 'warning' ? [239, 68, 68] :
          [107, 114, 128];

        doc.setTextColor(...iconColor);
        doc.setFontSize(12);
        doc.text(insight.type.toUpperCase(), 25, yPosition + 8);

        doc.setTextColor(30);
        doc.setFontSize(10);
        doc.text(insight.title, 25, yPosition + 15);
        
        doc.setFontSize(8);
        doc.setTextColor(60);
        const descLines = doc.splitTextToSize(insight.description, 140);
        doc.text(descLines[0], 25, yPosition + 21);

        yPosition += boxHeight + 5;
      });

      yPosition += 10;
    }

    onProgress?.(70);

    // Milestones
    if (options.includeMilestones !== false && data.milestones.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(30);
      doc.text('Achievements & Milestones', 20, yPosition);
      yPosition += 10;

      const unlockedMilestones = data.milestones.filter(m => m.unlockedAt);
      const pendingMilestones = data.milestones.filter(m => !m.unlockedAt);

      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(`✓ ${unlockedMilestones.length} Unlocked`, 20, yPosition);
      doc.setTextColor(156, 163, 175);
      doc.text(`○ ${pendingMilestones.length} In Progress`, 80, yPosition);
      yPosition += 10;

      // Show top milestones
      [...unlockedMilestones.slice(0, 3), ...pendingMilestones.slice(0, 2)].forEach(milestone => {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }

        const milestoneBgColor = milestone.unlockedAt ? [240, 253, 244] : [248, 250, 252];
        doc.setFillColor(...milestoneBgColor);
        doc.rect(20, yPosition, 170, 15, 'F');

        const milestoneTextColor = milestone.unlockedAt ? [16, 185, 129] : [107, 114, 128];
        doc.setTextColor(...milestoneTextColor);
        doc.text(milestone.unlockedAt ? '✓' : '○', 25, yPosition + 10);

        doc.setTextColor(30);
        doc.text(milestone.title, 35, yPosition + 10);

        doc.setTextColor(107, 114, 128);
        doc.text(`${milestone.progress}%`, 165, yPosition + 10);

        yPosition += 17;
      });
    }

    onProgress?.(85);

    // Recommendations
    if (options.includeRecommendations !== false && data.recommendations.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(30);
      doc.text('Personalized Recommendations', 20, yPosition);
      yPosition += 10;

      data.recommendations.slice(0, 3).forEach((rec, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Priority color
        const priorityColor = 
          rec.priority === 'high' ? [239, 68, 68] :
          rec.priority === 'medium' ? [245, 158, 11] :
          [107, 114, 128];

        doc.setFillColor(249, 250, 251);
        doc.roundedRect(20, yPosition, 170, 30, 2, 2, 'F');

        doc.setTextColor(...priorityColor);
        doc.setFontSize(8);
        doc.text(rec.priority.toUpperCase(), 25, yPosition + 7);

        doc.setTextColor(30);
        doc.setFontSize(11);
        doc.text(rec.title, 25, yPosition + 15);

        doc.setTextColor(60);
        doc.setFontSize(9);
        const actionLines = doc.splitTextToSize(rec.description, 160);
        doc.text(actionLines[0], 25, yPosition + 22);

        yPosition += 35;
      });
    }

    onProgress?.(95);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Generated by Couple Therapy AI', 105, 285, { align: 'center' });
    doc.text(`Export Version: ${data.metadata.exportVersion}`, 105, 290, { align: 'center' });

    onProgress?.(100);

    return doc.output('blob');
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  generateFilename(format: ExportFormat, prefix: string = 'therapy-progress'): string {
    const date = format === 'pdf' 
      ? format(new Date(), 'yyyy-MM-dd')
      : new Date().toISOString().split('T')[0];
    
    return `${prefix}-${date}.${format}`;
  }

  async downloadFile(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up after a delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  async shareFile(blob: Blob, filename: string): Promise<boolean> {
    // Check if Web Share API is available
    if (!navigator.share || !navigator.canShare) {
      return false;
    }

    const file = new File([blob], filename, { type: blob.type });
    
    try {
      await navigator.share({
        files: [file],
        title: 'Therapy Progress Report',
        text: 'Here is my therapy progress report'
      });
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
      }
      return false;
    }
  }
}