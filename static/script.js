// متغيرات عامة
let currentVideoInfo = null;

// عناصر DOM
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const videoInfo = document.getElementById('videoInfo');
const downloadProgress = document.getElementById('downloadProgress');
const thumbnail = document.getElementById('thumbnail');
const title = document.getElementById('title');
const uploader = document.getElementById('uploader');
const duration = document.getElementById('duration');
const downloadBtn = document.getElementById('downloadBtn');

// دوال مساعدة
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return 'غير معروف';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return 'غير معروف';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

// عرض الروابط المباشرة
function displayDirectLinks(formats, outputType) {
    if (!formats || formats.length === 0) {
        downloadProgress.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> 
                لا توجد روابط ${outputType === 'mp3' ? 'صوتية' : 'فيديو'} متاحة لهذا المحتوى
            </div>
        `;
        return;
    }
    
    let linksHtml = `
        <div class="direct-links">
            <h4><i class="fas fa-link"></i> روابط التحميل المباشرة:</h4>
            <ul>
    `;
    
    formats.forEach(format => {
        const quality = format.quality || 'عادي';
        const ext = format.ext || 'mp4';
        const size = format.filesize ? `(${formatFileSize(format.filesize)})` : '';
        const url = format.url;
        
        linksHtml += `
            <li>
                <strong><i class="fas fa-video"></i> ${quality}</strong>
                <span>${ext} ${size}</span>
                <a href="${url}" class="link-btn" download target="_blank">
                    <i class="fas fa-download"></i> تحميل مباشر
                </a>
            </li>
        `;
    });
    
    linksHtml += `
            </ul>
            <p class="note">
                <i class="fas fa-info-circle"></i> 
                ملاحظة: إذا لم يعمل التحميل مباشرة، اضغط بزر الفأرة الأيمن على الرابط واختر "حفظ الرابط باسم"
            </p>
        </div>
    `;
    
    downloadProgress.innerHTML = linksHtml;
}

// جلب معلومات الفيديو
fetchBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
        showError('الرجاء إدخال رابط الفيديو');
        return;
    }
    
    videoInfo.classList.add('hidden');
    downloadProgress.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loading.classList.remove('hidden');
    
    try {
        const response = await fetch('/get_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url })
        });
        
        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || 'حدث خطأ أثناء جلب المعلومات');
        }
        
        currentVideoInfo = data;
        
        thumbnail.src = data.thumbnail || 'https://via.placeholder.com/200x150?text=No+Image';
        title.textContent = data.title || 'بدون عنوان';
        uploader.textContent = data.uploader || 'غير معروف';
        duration.textContent = formatDuration(data.duration);
        
        videoInfo.classList.remove('hidden');
        
    } catch (error) {
        showError(error.message);
    } finally {
        loading.classList.add('hidden');
    }
});

// جلب روابط التحميل
downloadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const outputType = document.querySelector('input[name="outputType"]:checked').value;
    
    if (!url) {
        showError('الرجاء إدخال رابط الفيديو');
        return;
    }
    
    if (!currentVideoInfo) {
        showError('الرجاء الضغط على "جلب المعلومات" أولاً');
        return;
    }
    
    videoInfo.classList.add('hidden');
    downloadProgress.classList.remove('hidden');
    downloadProgress.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-small"></div>
            <p>جاري جلب الروابط المباشرة...</p>
        </div>
    `;
    
    try {
        let formats = currentVideoInfo.formats || [];
        
        if (outputType === 'mp3') {
            formats = formats.filter(f => f.media_type === 'audio');
        } else {
            formats = formats.filter(f => f.media_type === 'video' || f.media_type === 'video_no_audio');
        }
        
        if (formats.length === 0) {
            throw new Error(`لا توجد روابط ${outputType === 'mp3' ? 'صوتية' : 'فيديو'} متاحة`);
        }
        
        displayDirectLinks(formats, outputType);
        
    } catch (error) {
        showError(error.message);
        downloadProgress.classList.add('hidden');
        videoInfo.classList.remove('hidden');
    }
});

urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchBtn.click();
    }
});
