#!/usr/bin/env node

/**
 * Performance Testing Script for Therapy Application
 * Tests optimizations and catches issues before deployment
 */

const fs = require('fs').promises
const path = require('path')
const { spawn } = require('child_process')

// Performance thresholds (2025 standards)
const PERFORMANCE_THRESHOLDS = {
  bundleSize: {
    landing: 50000,     // 50KB max for landing page
    dashboard: 200000,  // 200KB max for dashboard
    total: 500000       // 500KB max total bundle
  },
  buildTime: {
    dev: 5000,         // 5s max dev server start
    build: 120000      // 2min max production build
  },
  dependencies: {
    maxDepth: 5,       // Max dependency nesting
    maxUnused: 10      // Max unused dependencies
  }
}

class PerformanceValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Performance Validation Suite\n')
    
    try {
      await this.validateDependencies()
      await this.validateBundleAnalysis()
      await this.validateCodeSplitting()
      await this.validateImageOptimization()
      await this.testBuildPerformance()
      await this.validateReactCompiler()
      
      this.printResults()
    } catch (error) {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    }
  }

  async validateDependencies() {
    console.log('📦 Validating Dependencies...')
    
    try {
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf8')
      )
      
      // Check for problematic dependencies
      const problematicDeps = [
        'lodash',           // Use lodash-es instead
        'moment',           // Use date-fns instead
        'styled-components' // Use Tailwind CSS instead
      ]
      
      const found = problematicDeps.filter(dep => 
        packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
      )
      
      if (found.length > 0) {
        this.logError(`Found problematic dependencies: ${found.join(', ')}`)
      } else {
        this.logPass('No problematic dependencies found')
      }
      
      // Check for duplicate dependencies
      const deps = Object.keys(packageJson.dependencies || {})
      const duplicates = deps.filter(dep => 
        dep.includes('react-query') && dep.includes('@tanstack/react-query')
      )
      
      if (duplicates.length > 0) {
        this.logError(`Duplicate dependencies found: ${duplicates.join(', ')}`)
      } else {
        this.logPass('No duplicate dependencies found')
      }
      
    } catch (error) {
      this.logError(`Failed to validate dependencies: ${error.message}`)
    }
  }

  async validateBundleAnalysis() {
    console.log('📊 Analyzing Bundle Size...')
    
    try {
      // Check if we have large files that should be code-split
      const largeFiles = await this.findLargeFiles([
        'src/app/page.tsx',
        'src/app/dashboard/page.tsx',
        'src/components/dashboard/CommunicationMetrics.tsx'
      ])
      
      largeFiles.forEach(({ file, size }) => {
        if (size > 100000) { // 100KB
          this.logWarning(`Large file detected: ${file} (${Math.round(size/1000)}KB)`)
        }
      })
      
      // Check for optimized versions
      const optimizedFiles = [
        'src/app/page.optimized.tsx',
        'src/app/dashboard/page.optimized.tsx',
        'src/components/ui/progressive-image-slider.tsx'
      ]
      
      for (const file of optimizedFiles) {
        try {
          await fs.access(file)
          this.logPass(`Optimized file exists: ${file}`)
        } catch {
          this.logError(`Missing optimized file: ${file}`)
        }
      }
      
    } catch (error) {
      this.logError(`Bundle analysis failed: ${error.message}`)
    }
  }

  async validateCodeSplitting() {
    console.log('✂️ Validating Code Splitting...')
    
    try {
      const patterns = [
        { pattern: /lazy\(\(\) => import/, description: 'React.lazy imports' },
        { pattern: /dynamic\(.*import/, description: 'Next.js dynamic imports' },
        { pattern: /<Suspense/, description: 'Suspense boundaries' }
      ]
      
      const files = [
        'src/app/page.optimized.tsx',
        'src/app/dashboard/page.optimized.tsx'
      ]
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8')
          
          patterns.forEach(({ pattern, description }) => {
            const matches = content.match(pattern)
            if (matches) {
              this.logPass(`${description} found in ${file}`)
            } else {
              this.logWarning(`${description} missing in ${file}`)
            }
          })
        } catch (error) {
          this.logWarning(`Could not read ${file}: ${error.message}`)
        }
      }
    } catch (error) {
      this.logError(`Code splitting validation failed: ${error.message}`)
    }
  }

  async validateImageOptimization() {
    console.log('🖼️ Validating Image Optimization...')
    
    try {
      const imageDir = 'public/images'
      const images = await this.findFiles(imageDir, ['.jpg', '.jpeg', '.png'])
      
      let largeImages = 0
      for (const image of images) {
        const stats = await fs.stat(image)
        if (stats.size > 500000) { // 500KB
          largeImages++
          this.logWarning(`Large image: ${image} (${Math.round(stats.size/1000)}KB)`)
        }
      }
      
      if (largeImages === 0) {
        this.logPass('All images under 500KB')
      }
      
      // Check for Next.js Image component usage
      const componentFiles = await this.findFiles('src', ['.tsx', '.jsx'])
      let imageComponentUsage = 0
      
      for (const file of componentFiles) {
        const content = await fs.readFile(file, 'utf8')
        if (content.includes('from "next/image"') || content.includes('from \'next/image\'')) {
          imageComponentUsage++
        }
      }
      
      if (imageComponentUsage > 0) {
        this.logPass(`Next.js Image component used in ${imageComponentUsage} files`)
      } else {
        this.logWarning('Next.js Image component not detected')
      }
      
    } catch (error) {
      this.logError(`Image optimization validation failed: ${error.message}`)
    }
  }

  async testBuildPerformance() {
    console.log('⚡ Testing Build Performance...')
    
    try {
      const startTime = Date.now()
      
      // Test TypeScript compilation
      const tscResult = await this.runCommand('npx tsc --noEmit')
      if (tscResult.success) {
        this.logPass('TypeScript compilation successful')
      } else {
        this.logError(`TypeScript errors: ${tscResult.error}`)
      }
      
      // Test Next.js build (if not too slow)
      if (process.env.SKIP_BUILD !== 'true') {
        console.log('Building Next.js application...')
        const buildResult = await this.runCommand('npm run build', 120000) // 2min timeout
        
        const buildTime = Date.now() - startTime
        if (buildResult.success) {
          if (buildTime < PERFORMANCE_THRESHOLDS.buildTime.build) {
            this.logPass(`Build completed in ${Math.round(buildTime/1000)}s`)
          } else {
            this.logWarning(`Build took ${Math.round(buildTime/1000)}s (threshold: ${PERFORMANCE_THRESHOLDS.buildTime.build/1000}s)`)
          }
        } else {
          this.logError(`Build failed: ${buildResult.error}`)
        }
      }
      
    } catch (error) {
      this.logError(`Build performance test failed: ${error.message}`)
    }
  }

  async validateReactCompiler() {
    console.log('🔧 Validating React Compiler Setup...')
    
    try {
      // Check next.config.js for React Compiler
      const nextConfigExists = await fs.access('next.config.optimized.js').then(() => true).catch(() => false)
      
      if (nextConfigExists) {
        const config = await fs.readFile('next.config.optimized.js', 'utf8')
        
        if (config.includes('reactCompiler')) {
          this.logPass('React Compiler configuration found')
        } else {
          this.logError('React Compiler not configured in next.config.js')
        }
        
        if (config.includes('compilationMode: \'annotation\'')) {
          this.logPass('React Compiler in safe annotation mode')
        } else {
          this.logWarning('React Compiler not in annotation mode (less safe)')
        }
      } else {
        this.logError('next.config.optimized.js not found')
      }
      
      // Check for babel-plugin-react-compiler in package.json
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'))
      if (packageJson.devDependencies?.['babel-plugin-react-compiler']) {
        this.logPass('babel-plugin-react-compiler installed')
      } else {
        this.logError('babel-plugin-react-compiler not installed')
      }
      
    } catch (error) {
      this.logError(`React Compiler validation failed: ${error.message}`)
    }
  }

  // Helper methods
  async findLargeFiles(files) {
    const results = []
    for (const file of files) {
      try {
        const stats = await fs.stat(file)
        results.push({ file, size: stats.size })
      } catch (error) {
        // File doesn't exist, skip
      }
    }
    return results
  }

  async findFiles(dir, extensions) {
    const files = []
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          files.push(...await this.findFiles(fullPath, extensions))
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory doesn't exist, skip
    }
    return files
  }

  async runCommand(command, timeout = 30000) {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ')
      const proc = spawn(cmd, args, { stdio: 'pipe' })
      
      let output = ''
      let error = ''
      
      proc.stdout?.on('data', (data) => output += data.toString())
      proc.stderr?.on('data', (data) => error += data.toString())
      
      const timer = setTimeout(() => {
        proc.kill()
        resolve({ success: false, error: 'Timeout' })
      }, timeout)
      
      proc.on('close', (code) => {
        clearTimeout(timer)
        resolve({
          success: code === 0,
          output,
          error: error || (code !== 0 ? `Process exited with code ${code}` : null)
        })
      })
    })
  }

  logPass(message) {
    console.log(`  ✅ ${message}`)
    this.results.passed++
  }

  logWarning(message) {
    console.log(`  ⚠️  ${message}`)
    this.results.warnings++
  }

  logError(message) {
    console.log(`  ❌ ${message}`)
    this.results.failed++
    this.results.errors.push(message)
  }

  printResults() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 PERFORMANCE VALIDATION RESULTS')
    console.log('='.repeat(60))
    console.log(`✅ Passed: ${this.results.passed}`)
    console.log(`⚠️  Warnings: ${this.results.warnings}`)
    console.log(`❌ Failed: ${this.results.failed}`)
    
    if (this.results.failed > 0) {
      console.log('\n🚨 CRITICAL ISSUES:')
      this.results.errors.forEach(error => console.log(`  • ${error}`))
      console.log('\nRecommendation: Fix these issues before proceeding to Phase 2')
      process.exit(1)
    } else if (this.results.warnings > 0) {
      console.log('\n⚠️  Consider addressing warnings for optimal performance')
    } else {
      console.log('\n🎉 All tests passed! Ready for Phase 2')
    }
  }
}

// Run the tests
if (require.main === module) {
  const validator = new PerformanceValidator()
  validator.runAllTests().catch(console.error)
}

module.exports = PerformanceValidator