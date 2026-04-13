import os
import re
import requests
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

YDL_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'ignoreerrors': True,
    'no_check_certificate': True,
    'prefer_insecure': True,
}

def get_video_info(url):
    try:
        with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if info is None:
                return {'error': 'لا يمكن الحصول على معلومات الفيديو'}
            
            formats = []
            seen = set()
            
            for f in info.get('formats', []):
                height = f.get('height', 0)
                format_note = f.get('format_note', '')
                
                if height:
                    quality = f"{height}p"
                elif format_note:
                    quality = format_note
                else:
                    quality = "عادي"
                
                ext = f.get('ext', 'mp4')
                vcodec = f.get('vcodec', 'none')
                acodec = f.get('acodec', 'none')
                
                if vcodec != 'none' and acodec != 'none':
                    media_type = 'video'
                elif vcodec != 'none':
                    media_type = 'video_no_audio'
                elif acodec != 'none':
                    media_type = 'audio'
                else:
                    continue
                
                key = f"{quality}_{ext}_{media_type}"
                if key in seen:
                    continue
                seen.add(key)
                
                url_direct = f.get('url') or f.get('manifest_url')
                if url_direct:
                    formats.append({
                        'quality': quality,
                        'ext': ext,
                        'media_type': media_type,
                        'url': url_direct,
                        'filesize': f.get('filesize'),
                    })
            
            formats.sort(key=lambda x: int(x['quality'].replace('p', '0')) if 'p' in x['quality'] else 0, reverse=True)
            
            return {
                'title': info.get('title', 'فيديو'),
                'thumbnail': info.get('thumbnail', ''),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', info.get('channel', 'غير معروف')),
                'formats': formats[:20]
            }
            
    except Exception as e:
        return {'error': str(e)[:200]}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_info', methods=['POST'])
def get_info():
    data = request.get_json()
    url = data.get('url', '').strip()
    
    if not url:
        return jsonify({'error': 'الرجاء إدخال رابط الفيديو'}), 400
    
    if not (url.startswith('http://') or url.startswith('https://')):
        url = 'https://' + url
    
    result = get_video_info(url)
    
    if 'error' in result:
        return jsonify({'error': result['error']}), 400
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
