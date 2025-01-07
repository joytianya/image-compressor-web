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
        this.watermarkColor = document.getElementById('watermarkColor');
        this.watermarkOpacity = document.getElementById('watermarkOpacity');
        this.opacityValue = document.getElementById('opacityValue');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.loadingOverlay = document.querySelector('.loading-overlay');
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
            this.qualityValue.textContent = `${this.qualityInput.value}%`;
        });
        
        // 压缩和下载事件
        this.compressBtn.addEventListener('click', () => this.compressImage());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());

        // 新增事件
        this.enableWatermark.addEventListener('change', () => {
            const enabled = this.enableWatermark.checked;
            this.watermarkText.disabled = !enabled;
            this.watermarkColor.disabled = !enabled;
            this.watermarkOpacity.disabled = !enabled;
        });

        this.watermarkOpacity.addEventListener('input', () => {
            this.opacityValue.textContent = `${this.watermarkOpacity.value}%`;
        });

        this.downloadAllBtn.addEventListener('click', () => this.downloadAllImages());
    }

    handleFileSelect(e) {
        this.files.clear(); // 清除之前的文件
        this.fileItems.innerHTML = ''; // 清除文件列表
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.files.clear(); // 清除之前的文件
        this.fileItems.innerHTML = ''; // 清除文件列表
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    processFiles(files) {
        files.forEach(file => {
            // 检查文件类型
            if (!this.supportedFormats.includes(file.type)) {
                this.showError(`${file.name} 格式不支持，仅支持 JPG、PNG、WebP`);
                return;
            }

            // 检查文件大小
            if (file.size > this.maxFileSize) {
                this.showError(`${file.name} 超过大小限制 10MB`);
                return;
            }

            // 添加到文件列表
            this.addFileToList(file);
            
            // 显示第一张图片的预览
            if (this.files.size === 1) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        this.originalImage = img;
                        this.originalPreview.src = e.target.result;
                        this.originalInfo.textContent = 
                            `${img.width} x ${img.height} - ${(file.size / 1024).toFixed(2)}KB`;
                        
                        // 设置默认的宽度和高度
                        this.widthInput.value = img.width;
                        this.heightInput.value = img.height;
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        this.updateFileCount();
        this.fileList.style.display = 'block';
        this.settingsPanel.style.display = 'block';
    }

    addFileToList(file) {
        const fileId = Date.now() + Math.random();
        this.files.set(fileId, file);

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = fileId;

        // 创建预览图
        const reader = new FileReader();
        reader.onload = (e) => {
            fileItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <span class="remove-file">×</span>
            `;

            // 绑定删除事件
            fileItem.querySelector('.remove-file').addEventListener('click', () => {
                this.files.delete(fileId);
                fileItem.remove();
                this.updateFileCount();
            });
        };
        reader.readAsDataURL(file);

        this.fileItems.appendChild(fileItem);
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
                const result = await this.processImage(file);
                await this.applyFilters(result);
                if (this.enableWatermark.checked) {
                    await this.addWatermark(result);
                }
                this.updateCompressedPreview(result);
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
                    
                    let width = parseInt(this.widthInput.value) || img.width;
                    let height = parseInt(this.heightInput.value) || img.height;
                    
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

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.font = '20px Arial';
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

    updateCompressedPreview(canvas) {
        // 根据不同格式使用不同的压缩参数
        const format = this.formatSelect.value;
        const quality = parseInt(this.qualityInput.value) / 100;
        
        // 对于PNG格式，使用较高的质量值以保持透明度
        const compressionQuality = format === 'image/png' ? 1 : quality;

        canvas.toBlob((blob) => {
            this.compressedBlob = blob;
            const url = URL.createObjectURL(blob);
            this.compressedPreview.src = url;
            this.compressedInfo.textContent = 
                `${canvas.width} x ${canvas.height} - ${(blob.size / 1024).toFixed(2)}KB`;
            this.downloadBtn.style.display = 'inline-block';
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
}

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
    new ImageCompressor();
}); 