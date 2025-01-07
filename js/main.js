class ImageCompressor {
    constructor() {
        this.initElements();
        this.bindEvents();
        this.originalImage = null;
        this.compressedBlob = null;
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
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processImage(file);
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            this.processImage(file);
        } else {
            alert('请上传图片文件！');
        }
    }

    processImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.widthInput.value = img.width;
                this.heightInput.value = img.height;
                this.originalPreview.src = e.target.result;
                this.originalInfo.textContent = `${img.width} x ${img.height} - ${(file.size / 1024).toFixed(2)}KB`;
                this.settingsPanel.style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleDimensionChange(type) {
        if (!this.keepRatio.checked || !this.originalImage) return;

        const ratio = this.originalImage.width / this.originalImage.height;
        if (type === 'width') {
            const width = parseInt(this.widthInput.value) || 0;
            this.heightInput.value = Math.round(width / ratio);
        } else {
            const height = parseInt(this.heightInput.value) || 0;
            this.widthInput.value = Math.round(height * ratio);
        }
    }

    compressImage() {
        if (!this.originalImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const width = parseInt(this.widthInput.value);
        const height = parseInt(this.heightInput.value);
        const quality = parseInt(this.qualityInput.value) / 100;

        canvas.width = width;
        canvas.height = height;
        
        // 绘制图片
        ctx.drawImage(this.originalImage, 0, 0, width, height);
        
        // 转换为blob
        canvas.toBlob((blob) => {
            this.compressedBlob = blob;
            const url = URL.createObjectURL(blob);
            this.compressedPreview.src = url;
            this.compressedInfo.textContent = 
                `${width} x ${height} - ${(blob.size / 1024).toFixed(2)}KB`;
            this.downloadBtn.style.display = 'inline-block';
        }, 'image/jpeg', quality);
    }

    downloadImage() {
        if (!this.compressedBlob) return;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.compressedBlob);
        link.download = 'compressed-image.jpg';
        link.click();
    }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
    new ImageCompressor();
}); 