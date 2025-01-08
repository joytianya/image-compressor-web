class ImageCompressor {
    constructor() {
        this.initElements();
        this.bindEvents();
        this.files = new Map(); // 存储多个文件
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    }

    initElements() {
        // 上传相关元素
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        
        // 预览相关元素
        this.settingsPanel = document.querySelector('.settings-panel');
        this.originalPreview = document.getElementById('originalPreview');
        this.compressedPreview = document.getElementById('compressedPreview');
        this.originalInfo = document.getElementById('originalInfo');
        this.compressedInfo = document.getElementById('compressedInfo');
        
        // 设置相关元素
        this.widthInput = document.getElementById('widthInput');
        this.heightInput = document.getElementById('heightInput');
        this.keepRatio = document.getElementById('keepRatio');
        this.qualityInput = document.getElementById('qualityInput');
        this.qualityValue = document.getElementById('qualityValue');
        this.compressBtn = document.getElementById('compressBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // 新增元素
        this.fileList = document.getElementById('fileList');
        this.fileItems = document.getElementById('fileItems');
        this.fileCount = document.getElementById('fileCount');
        this.formatSelect = document.getElementById('formatSelect');
        this.filterSelect = document.getElementById('filterSelect');
        this.enableWatermark = document.getElementById('enableWatermark');
        this.watermarkText = document.getElementById('watermarkText');
        this.watermarkSize = document.getElementById('watermarkSize');
        this.watermarkColor = document.getElementById('watermarkColor');
        this.watermarkOpacity = document.getElementById('watermarkOpacity');
        this.opacityValue = document.getElementById('opacityValue');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.loadingOverlay = document.querySelector('.loading-overlay');
        this.enableResize = document.getElementById('enableResize');

        // 初始化滑块背景
        this.updateRangeBackground(this.qualityInput);
        this.updateRangeBackground(this.watermarkOpacity);

        // 初始化折叠面板
        this.initCollapsiblePanels();
    }

    initCollapsiblePanels() {
        const panels = document.querySelectorAll('.collapsible');
        panels.forEach(panel => {
            const header = panel.querySelector('.group-header');
            header.addEventListener('click', () => {
                // 关闭其他面板
                panels.forEach(p => {
                    if (p !== panel && p.classList.contains('active')) {
                        p.classList.remove('active');
                    }
                });
                // 切换当前面板
                panel.classList.toggle('active');
            });
        });
    }

    bindEvents() {
        // 文件上传相关事件
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));

        // 压缩设置相关事件
        this.widthInput.addEventListener('input', () => this.handleDimensionChange('width'));
        this.heightInput.addEventListener('input', () => this.handleDimensionChange('height'));
        this.qualityInput.addEventListener('input', () => {
            const value = this.qualityInput.value;
            this.qualityValue.textContent = `${value}%`;
            // 更新滑块背景
            this.updateRangeBackground(this.qualityInput);
        });
        
        // 压缩和下载事件
        this.compressBtn.addEventListener('click', () => this.compressImage());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());

        // 新增事件
        this.enableWatermark.addEventListener('change', () => {
            const enabled = this.enableWatermark.checked;
            this.watermarkText.disabled = !enabled;
            this.watermarkSize.disabled = !enabled;
            this.watermarkColor.disabled = !enabled;
            this.watermarkOpacity.disabled = !enabled;
        });

        this.watermarkOpacity.addEventListener('input', () => {
            const value = this.watermarkOpacity.value;
            this.opacityValue.textContent = `${value}%`;
            // 更新滑块背景
            this.updateRangeBackground(this.watermarkOpacity);
        });

        this.downloadAllBtn.addEventListener('click', () => this.downloadAllImages());

        // 尺寸设置启用/禁用事件
        this.enableResize.addEventListener('change', () => {
            const enabled = this.enableResize.checked;
            this.widthInput.disabled = !enabled;
            this.heightInput.disabled = !enabled;
            this.keepRatio.disabled = !enabled;
        });
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        this.processFiles(files);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;
        this.processFiles(files);
    }

    processFiles(files) {
        // 清除之前的文件和预览
        this.files.clear();
        const previewContainer = document.getElementById('previewContainer');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        
        // 隐藏下载按钮
        this.downloadBtn.style.display = 'none';
        this.downloadAllBtn.style.display = 'none';
        // 清除压缩后的blob
        this.compressedBlob = null;

        files.forEach(file => {
            if (!this.supportedFormats.includes(file.type)) {
                this.showError(`${file.name} 格式不支持，仅支持 JPG、PNG、WebP`);
                return;
            }

            if (file.size > this.maxFileSize) {
                this.showError(`${file.name} 超过大小限制 10MB`);
                return;
            }

            // 直接添加到预览区域
            this.addToPreview(file);
            
            // 设置第一张图片的尺寸作为默认值
            if (this.files.size === 1) {
                const img = new Image();
                img.onload = () => {
                    this.widthInput.value = img.width;
                    this.heightInput.value = img.height;
                };
                img.src = URL.createObjectURL(file);
            }
        });

        // 上传后切换到紧凑模式
        this.dropZone.classList.add('compact');
        
        // 显示预览区域
        const previewSection = document.querySelector('.preview-section');
        if (previewSection) {
            previewSection.style.display = 'block';
        }
    }

    addToPreview(file) {
        // 创建并添加预览组
        const previewGroup = this.createPreviewGroup(file);
        // 使用预览组的 data-file-id 作为文件ID
        const fileId = previewGroup.dataset.fileId;
        this.files.set(fileId, file);

        const previewContainer = document.getElementById('previewContainer');
        if (previewContainer) {
            previewContainer.appendChild(previewGroup);
        }
    }

    updateFileCount() {
        this.fileCount.textContent = this.files.size;
        this.downloadAllBtn.style.display = this.files.size > 1 ? 'inline-block' : 'none';
    }

    async compressImage() {
        if (this.files.size === 0) return;

        this.showLoading();

        try {
            for (const [fileId, file] of this.files) {
                // 找到对应的预览组
                const previewGroup = document.querySelector(`.image-preview[data-file-id="${fileId}"]`);
                if (!previewGroup) continue;

                const result = await this.processImage(file);
                await this.applyFilters(result);
                if (this.enableWatermark.checked) {
                    await this.addWatermark(result);
                }
                this.updateCompressedPreview(result, previewGroup);
            }
            // 显示下载按钮
            this.downloadBtn.style.display = 'inline-block';
            if (this.files.size > 1) {
                this.downloadAllBtn.style.display = 'inline-block';
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 只有在启用尺寸调整时才使用自定义尺寸
                    let width = this.enableResize.checked ? (parseInt(this.widthInput.value) || img.width) : img.width;
                    let height = this.enableResize.checked ? (parseInt(this.heightInput.value) || img.height) : img.height;
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 清除画布
                    ctx.clearRect(0, 0, width, height);
                    
                    // 设置图片平滑
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas);
                };
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    async applyFilters(canvas) {
        const filter = this.filterSelect.value;
        if (filter === 'none') return canvas;

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        switch (filter) {
            case 'grayscale':
                for (let i = 0; i < pixels.length; i += 4) {
                    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
                    pixels[i] = pixels[i + 1] = pixels[i + 2] = avg;
                }
                break;
            case 'sepia':
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    pixels[i] = (r * 0.393) + (g * 0.769) + (b * 0.189);
                    pixels[i + 1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
                    pixels[i + 2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
                }
                break;
            case 'blur':
                // 简单的模糊效果
                ctx.filter = 'blur(2px)';
                ctx.drawImage(canvas, 0, 0);
                ctx.filter = 'none';
                break;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    async addWatermark(canvas) {
        const ctx = canvas.getContext('2d');
        const text = this.watermarkText.value;
        const color = this.watermarkColor.value;
        const opacity = parseInt(this.watermarkOpacity.value) / 100;
        const fontSize = parseInt(this.watermarkSize.value) || 20;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, canvas.width - 10, canvas.height - 10);
        ctx.restore();

        return canvas;
    }

    async downloadAllImages() {
        this.showLoading();

        try {
            const zip = new JSZip();
            const promises = [];
            const format = this.formatSelect.value;
            const quality = parseInt(this.qualityInput.value) / 100;
            const compressionQuality = format === 'image/png' ? 1 : quality;

            for (const [fileId, file] of this.files) {
                const promise = this.processImage(file)
                    .then(canvas => this.applyFilters(canvas))
                    .then(canvas => {
                        if (this.enableWatermark.checked) {
                            return this.addWatermark(canvas);
                        }
                        return canvas;
                    })
                    .then(canvas => {
                        return new Promise(resolve => {
                            canvas.toBlob(blob => {
                                const fileName = `compressed_${file.name}`;
                                zip.file(fileName, blob);
                                resolve();
                            }, format, compressionQuality);
                        });
                    });
                promises.push(promise);
            }

            await Promise.all(promises);
            const content = await zip.generateAsync({type: 'blob'});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'compressed_images.zip';
            link.click();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showError(message) {
        alert(message); // 可以改为更友好的提示方式
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    updateCompressedPreview(canvas, previewGroup) {
        const format = this.formatSelect.value;
        const quality = parseInt(this.qualityInput.value) / 100;
        const compressionQuality = format === 'image/png' ? 1 : quality;

        canvas.toBlob((blob) => {
            this.compressedBlob = blob;
            const url = URL.createObjectURL(blob);
            const compressedImg = previewGroup.querySelector('.compressed img');
            const compressedInfo = previewGroup.querySelector('.compressed .image-info');
            compressedImg.src = url;
            compressedInfo.textContent = 
                `${canvas.width} x ${canvas.height} - ${(blob.size / 1024).toFixed(2)}KB`;
        }, format, compressionQuality);
    }

    downloadImage() {
        if (!this.compressedBlob) return;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.compressedBlob);
        const format = this.formatSelect.value.split('/')[1];
        link.download = `compressed_image.${format}`;
        link.click();
    }

    clearPreviews() {
        const existingContainer = this.settingsPanel.querySelector('.preview-container');
        if (existingContainer) {
            existingContainer.remove();
        }
    }

    createPreviewGroup(file) {
        const group = document.createElement('div');
        group.className = 'image-preview';
        const fileId = Date.now() + Math.random();
        group.dataset.fileId = fileId;
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'preview-title';
        titleDiv.textContent = file.name;
        group.appendChild(titleDiv);

        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-images';
        
        const originalDiv = document.createElement('div');
        originalDiv.className = 'original';
        originalDiv.innerHTML = `
            <h3>原图</h3>
            <img class="preview-img">
            <div class="image-info"></div>
        `;
        
        const compressedDiv = document.createElement('div');
        compressedDiv.className = 'compressed';
        compressedDiv.innerHTML = `
            <h3>压缩后</h3>
            <img class="preview-img">
            <div class="image-info"></div>
        `;
        
        previewContainer.appendChild(originalDiv);
        previewContainer.appendChild(compressedDiv);
        group.appendChild(previewContainer);

        // 显示原图预览
        const previewImg = originalDiv.querySelector('img');
        const url = URL.createObjectURL(file);
        
        // 先创建一个临时图片来获取实际尺寸
        const tempImg = new Image();
        tempImg.onload = () => {
            const width = tempImg.naturalWidth;
            const height = tempImg.naturalHeight;
            
            // 更新预览图和信息
            previewImg.src = url;
            originalDiv.querySelector('.image-info').textContent = 
                `${width} x ${height} - ${(file.size / 1024).toFixed(2)}KB`;
            
            // 如果是第一张图片，设置为默认尺寸
            if (this.files.size === 1) {
                this.widthInput.value = width;
                this.heightInput.value = height;
            }
            
            // 清理临时对象
            URL.revokeObjectURL(url);
        };
        tempImg.src = url;

        return group;
    }

    // 添加新方法：更新滑块背景
    updateRangeBackground(rangeInput) {
        const value = rangeInput.value;
        const max = rangeInput.max;
        const percentage = (value / max) * 100;
        rangeInput.style.background = `linear-gradient(to right, 
            var(--primary-color) 0%, 
            var(--primary-color) ${percentage}%, 
            var(--border-color) ${percentage}%, 
            var(--border-color) 100%)`;
    }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
    new ImageCompressor();
}); 