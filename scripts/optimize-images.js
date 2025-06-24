#!/usr/bin/env node

/**
 * Image Optimization Script
 * Compresses images to reduce bundle size and improve performance
 */

const fs = require('fs').promises
const path = require('path')
const { spawn } = require('child_process')

const IMAGE_THRESHOLDS = {
  maxSize: 500000,        // 500KB max per image
  quality: {
    jpeg: 85,
    png: 85,
    webp: 85
  },
  targetSizes: {
    hero: { width: 1920, height: 1080 },
    heroMobile: { width: 1200, height: 800 },
    thumbnail: { width: 400, height: 300 },
    avatar: { width: 200, height: 200 }
  }
}

class ImageOptimizer {
  constructor() {
    this.processedImages = 0
    this.totalSaved = 0
  }

  async optimizeAll() {
    console.log('🖼️  Starting Image Optimization...\n')
    
    try {
      // Check if sharp is available for processing
      const hasSharp = await this.checkSharp()
      if (!hasSharp) {
        console.log('⚠️  Sharp not available, using basic optimization')
      }
      
      await this.optimizeDirectory('public/images')
      
      console.log('\n' + '='.repeat(50))
      console.log(`📊 Optimization Complete!`)
      console.log(`Images processed: ${this.processedImages}`)
      console.log(`Total space saved: ${Math.round(this.totalSaved / 1000)}KB`)
      console.log('='.repeat(50))
      
    } catch (error) {
      console.error('❌ Image optimization failed:', error)
      process.exit(1)
    }
  }

  async optimizeDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        
        if (entry.isDirectory()) {
          await this.optimizeDirectory(fullPath)
        } else if (this.isImageFile(entry.name)) {
          await this.optimizeImage(fullPath)
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dirPath}:`, error.message)
    }
  }

  async optimizeImage(imagePath) {
    try {
      const stats = await fs.stat(imagePath)
      const originalSize = stats.size
      
      if (originalSize < IMAGE_THRESHOLDS.maxSize) {
        console.log(`  ✅ ${imagePath} (${Math.round(originalSize/1000)}KB - already optimized)`)
        return
      }
      
      console.log(`  🔄 Optimizing ${imagePath} (${Math.round(originalSize/1000)}KB)...`)
      
      // Create optimized version
      const optimizedPath = this.getOptimizedPath(imagePath)
      const success = await this.compressImage(imagePath, optimizedPath)
      
      if (success) {
        const newStats = await fs.stat(optimizedPath)
        const newSize = newStats.size
        const saved = originalSize - newSize
        
        if (saved > 0) {
          // Replace original with optimized
          await fs.rename(optimizedPath, imagePath)
          
          this.processedImages++
          this.totalSaved += saved
          
          const percent = Math.round((saved / originalSize) * 100)
          console.log(`    ✅ Saved ${Math.round(saved/1000)}KB (${percent}%) -> ${Math.round(newSize/1000)}KB`)
        } else {
          // Remove optimized file if no improvement
          await fs.unlink(optimizedPath)
          console.log(`    ⚠️  No improvement gained`)
        }
      } else {
        console.log(`    ❌ Failed to optimize`)
      }
      
    } catch (error) {
      console.warn(`  ❌ Error optimizing ${imagePath}:`, error.message)
    }
  }

  async compressImage(inputPath, outputPath) {
    const ext = path.extname(inputPath).toLowerCase()
    
    try {
      if (ext === '.jpg' || ext === '.jpeg') {
        return await this.compressJpeg(inputPath, outputPath)
      } else if (ext === '.png') {
        return await this.compressPng(inputPath, outputPath)
      } else if (ext === '.webp') {
        return await this.compressWebp(inputPath, outputPath)
      }
      return false
    } catch (error) {
      console.warn(`Compression failed for ${inputPath}:`, error.message)
      return false
    }
  }

  async compressJpeg(inputPath, outputPath) {
    // Try multiple methods in order of preference
    const methods = [
      () => this.useSharp(inputPath, outputPath, { format: 'jpeg', quality: IMAGE_THRESHOLDS.quality.jpeg }),
      () => this.useImageMagick(inputPath, outputPath, `-quality ${IMAGE_THRESHOLDS.quality.jpeg}`),
      () => this.copyWithResize(inputPath, outputPath)
    ]
    
    for (const method of methods) {
      try {
        const success = await method()
        if (success) return true
      } catch (error) {
        continue
      }
    }
    return false
  }

  async compressPng(inputPath, outputPath) {
    const methods = [
      () => this.useSharp(inputPath, outputPath, { format: 'png', quality: IMAGE_THRESHOLDS.quality.png }),
      () => this.usePngquant(inputPath, outputPath),
      () => this.copyWithResize(inputPath, outputPath)
    ]
    
    for (const method of methods) {
      try {
        const success = await method()
        if (success) return true
      } catch (error) {
        continue
      }
    }
    return false
  }

  async compressWebp(inputPath, outputPath) {
    const methods = [
      () => this.useSharp(inputPath, outputPath, { format: 'webp', quality: IMAGE_THRESHOLDS.quality.webp }),
      () => this.useCwebp(inputPath, outputPath),
      () => this.copyWithResize(inputPath, outputPath)
    ]
    
    for (const method of methods) {
      try {
        const success = await method()
        if (success) return true
      } catch (error) {
        continue
      }
    }
    return false
  }

  async useSharp(inputPath, outputPath, options) {
    try {
      const sharp = require('sharp')
      
      let pipeline = sharp(inputPath)
      
      // Determine target size based on image type
      const targetSize = this.getTargetSize(inputPath)
      if (targetSize) {
        pipeline = pipeline.resize(targetSize.width, targetSize.height, {
          fit: 'cover',
          withoutEnlargement: true
        })
      }
      
      if (options.format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: options.quality, progressive: true })
      } else if (options.format === 'png') {
        pipeline = pipeline.png({ quality: options.quality, compressionLevel: 9 })
      } else if (options.format === 'webp') {
        pipeline = pipeline.webp({ quality: options.quality })
      }
      
      await pipeline.toFile(outputPath)
      return true
    } catch (error) {
      return false
    }
  }

  async useImageMagick(inputPath, outputPath, options) {
    return new Promise((resolve) => {
      const proc = spawn('magick', ['convert', inputPath, options, outputPath], { stdio: 'pipe' })
      proc.on('close', (code) => resolve(code === 0))
      proc.on('error', () => resolve(false))
    })
  }

  async usePngquant(inputPath, outputPath) {
    return new Promise((resolve) => {
      const proc = spawn('pngquant', ['--quality=65-85', '--output', outputPath, inputPath], { stdio: 'pipe' })
      proc.on('close', (code) => resolve(code === 0))
      proc.on('error', () => resolve(false))
    })
  }

  async useCwebp(inputPath, outputPath) {
    return new Promise((resolve) => {
      const proc = spawn('cwebp', ['-q', '85', inputPath, '-o', outputPath], { stdio: 'pipe' })
      proc.on('close', (code) => resolve(code === 0))
      proc.on('error', () => resolve(false))
    })
  }

  async copyWithResize(inputPath, outputPath) {
    // Last resort - just copy the file
    try {
      await fs.copyFile(inputPath, outputPath)
      return true
    } catch {
      return false
    }
  }

  async checkSharp() {
    try {
      require('sharp')
      return true
    } catch {
      return false
    }
  }

  getTargetSize(imagePath) {
    const filename = path.basename(imagePath, path.extname(imagePath))
    
    if (filename.includes('large') || filename.includes('lg')) {
      return IMAGE_THRESHOLDS.targetSizes.hero
    } else if (imagePath.includes('mobile') || filename.includes('mobile')) {
      return IMAGE_THRESHOLDS.targetSizes.heroMobile
    } else if (filename.includes('thumb') || filename.includes('small')) {
      return IMAGE_THRESHOLDS.targetSizes.thumbnail
    } else if (filename.includes('avatar') || filename.includes('profile')) {
      return IMAGE_THRESHOLDS.targetSizes.avatar
    }
    
    // Default to hero size for large images
    return IMAGE_THRESHOLDS.targetSizes.hero
  }

  getOptimizedPath(imagePath) {
    const dir = path.dirname(imagePath)
    const ext = path.extname(imagePath)
    const name = path.basename(imagePath, ext)
    return path.join(dir, `${name}_optimized${ext}`)
  }

  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    return imageExtensions.includes(path.extname(filename).toLowerCase())
  }
}

// Run the optimizer
if (require.main === module) {
  const optimizer = new ImageOptimizer()
  optimizer.optimizeAll().catch(console.error)
}

module.exports = ImageOptimizer