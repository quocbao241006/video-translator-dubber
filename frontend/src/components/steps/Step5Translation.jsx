import { useState, useRef, useEffect } from 'react';
import useProjectStore from '../../store/projectStore';
import api from '../../services/api';
import VideoPlayer from '../video/VideoPlayer';
import toast from 'react-hot-toast';
import { Copy, Sparkles, BookOpen, BarChart2, Plus, X, Globe2 } from 'lucide-react';



function Step5Translation() {
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const segments = useProjectStore((s) => s.segments);
  const updateSegment = useProjectStore((s) => s.updateSegment);
  const glossary = useProjectStore((s) => s.glossary);
  const addGlossaryTerm = useProjectStore((s) => s.addGlossaryTerm);
  const removeGlossaryTerm = useProjectStore((s) => s.removeGlossaryTerm);

  const setSegments = useProjectStore((s) => s.setSegments);
  const jobId = useProjectStore((s) => s.jobId);
  const setProgress = useProjectStore((s) => s.setProgress);

  const [translated, setTranslated] = useState(segments.some((s) => s.text_vi));
  const [newZh, setNewZh] = useState('');
  const [newVi, setNewVi] = useState('');
  const [aiResult, setAiResult] = useState('');
  const videoRef = useRef(null);



  const translatedCount = segments.filter((s) => s.text_vi).length;
  const longCount = segments.filter((s) => s.text_vi && s.text_vi.length > 50).length;
  const needsFixCount = segments.filter((s) => !s.text_vi).length;

  const handleCopyPrompt = () => {
    // Xây dựng glossary string
    let glossaryText = '';
    if (glossary.length > 0) {
      glossaryText = '\\nTỪ ĐIỂN THUẬT NGỮ (BẮT BUỘC tuân thủ):\\n';
      glossary.forEach(term => {
        glossaryText += `  ${term.zh} → ${term.vi}\\n`;
      });
    }

    // Tính toán max_vi_chars (Tăng lên theo chuẩn đọc phụ đề tiếng Việt: ~18-20 ký tự/giây, tối thiểu 20 ký tự)
    const segmentsJson = segments.map(seg => {
      const duration = seg.end - seg.start;
      const maxChars = Math.max(20, Math.floor(duration * 18));
      return {
        id: seg.id,
        text_zh: seg.text_zh,
        max_vi_chars: maxChars
      };
    });

    const prompt = `Bạn là chuyên gia dịch thuật phụ đề từ tiếng Trung sang tiếng Việt.
Đây là phim hoạt hình Trung Quốc (donghua). Dùng ngôn ngữ tự nhiên, thuật ngữ Hán-Việt cho tu tiên/võ hiệp. Tên riêng phiên âm Hán-Việt.
${glossaryText}
QUY TẮC:
1. Mỗi câu dịch PHẢI ngắn hơn hoặc bằng max_vi_chars ký tự
2. Nếu quá dài → diễn đạt ngắn gọn hơn, giữ nghĩa chính
3. Ưu tiên: ĐÚNG NGHĨA > TỰ NHIÊN > ĐẦY ĐỦ
4. Dùng đúng thuật ngữ trong từ điển nếu có

CÁC CÂU CẦN DỊCH:
${JSON.stringify(segmentsJson, null, 2)}

Bạn PHẢI trả về ĐÚNG MỘT JSON OBJECT theo định dạng sau:
{"translations": [{"id": 1, "text_vi": "..."}]}
CHỈ trả về JSON object, không có bất kỳ văn bản nào khác.`;

    navigator.clipboard.writeText(prompt).then(() => {
      toast.success('Đã copy Prompt! Hãy mang sang dán vào ChatGPT hoặc Claude.');
    }).catch(err => {
      console.error('Lỗi khi copy:', err);
      toast.error('Không thể copy tự động. Hãy thử lại.');
    });
  };

  const handleApplyAiResult = () => {
    if (!aiResult.trim()) {
      return toast.error('Vui lòng dán kết quả JSON từ AI vào ô trống.');
    }

    try {
      let textToParse = aiResult.trim();
      // Loại bỏ markdown code blocks nếu AI trả về kèm theo
      if (textToParse.includes('\`\`\`json')) {
        textToParse = textToParse.split('\`\`\`json')[1].split('\`\`\`')[0].trim();
      } else if (textToParse.includes('\`\`\`')) {
        textToParse = textToParse.split('\`\`\`')[1].trim();
      }

      const data = JSON.parse(textToParse);
      if (!data.translations || !Array.isArray(data.translations)) {
        throw new Error('Dữ liệu JSON không đúng cấu trúc {"translations": [...]}');
      }

      const transMap = {};
      data.translations.forEach(t => {
        if (t.id && t.text_vi) transMap[t.id] = t.text_vi;
      });

      const newSegments = segments.map(seg => ({
        ...seg,
        text_vi: transMap[seg.id] || seg.text_vi || ''
      }));

      setSegments(newSegments);
      setTranslated(true);
      setProgress(100, 'Dịch thủ công hoàn tất');
      setAiResult('');
      toast.success('Đã cập nhật phụ đề thành công!');
    } catch (e) {
      toast.error('Lỗi khi đọc JSON từ AI: ' + e.message);
    }
  };

  const handleAddGlossary = () => {
    if (!newZh.trim() || !newVi.trim()) return;
    addGlossaryTerm({ zh: newZh.trim(), vi: newVi.trim() });
    setNewZh('');
    setNewVi('');
  };

  return (
    <>
      <div className="panel-main">
        <VideoPlayer ref={videoRef} src={videoUrl} />

        {/* Subtitle preview overlay */}
        {translated && segments.length > 0 && (
          <div style={{
            position: 'relative',
            marginTop: 'var(--space-sm)',
            padding: 'var(--space-md)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
              📝 Preview phụ đề
            </div>
            <div style={{ textAlign: 'center', fontSize: '18px', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              {segments[0]?.text_vi || 'Chưa có phụ đề'}
            </div>
          </div>
        )}
      </div>

      <div className="panel-tools">
        <div className="panel-tools-header">
          <span className="panel-tools-title"><Globe2 size={20} className="text-purple-400" /> Dịch thuật</span>
        </div>
        <div className="panel-tools-body">
          {/* Glossary Section */}
          <div className="section-title"><BookOpen size={16} /> Bảng thuật ngữ <span className="badge badge-info">{glossary.length}</span></div>
          <div className="glossary-list" style={{ marginBottom: 'var(--space-md)' }}>
            {glossary.map((term, i) => (
              <div key={i} className="glossary-item">
                <span className="glossary-item-zh">{term.zh}</span>
                <span className="glossary-item-arrow">→</span>
                <span className="glossary-item-vi">{term.vi}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => removeGlossaryTerm(i)} style={{ padding: '2px 6px' }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="glossary-add">
            <input
              className="input"
              placeholder="Tiếng Trung"
              value={newZh}
              onChange={(e) => setNewZh(e.target.value)}
            />
            <input
              className="input"
              placeholder="Tiếng Việt"
              value={newVi}
              onChange={(e) => setNewVi(e.target.value)}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleAddGlossary}>
              <Plus size={14} /> Thêm
            </button>
          </div>

          <div className="section-divider" />

          {/* Stats */}
          <div className="section-title"><BarChart2 size={16} /> Thống kê</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <div className="upload-meta-item">
              <div className="upload-meta-label">Tổng đoạn</div>
              <div className="upload-meta-value">{segments.length}</div>
            </div>
            <div className="upload-meta-item">
              <div className="upload-meta-label">Đã dịch</div>
              <div className="upload-meta-value" style={{ color: 'var(--success)' }}>{translatedCount}</div>
            </div>
            <div className="upload-meta-item">
              <div className="upload-meta-label">Cần sửa</div>
              <div className="upload-meta-value" style={{ color: needsFixCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {needsFixCount}
              </div>
            </div>
            <div className="upload-meta-item">
              <div className="upload-meta-label">Quá dài</div>
              <div className="upload-meta-value" style={{ color: longCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {longCount}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ padding: 'var(--space-md)', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--purple-500)' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Bước 1: Lấy Prompt</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Nhấn nút dưới đây để copy toàn bộ phụ đề thành một câu lệnh chuẩn. Sau đó mang dán vào ChatGPT hoặc Claude để nhờ AI dịch.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleCopyPrompt}
                disabled={segments.length === 0}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                <Copy size={16} /> Copy Prompt kèm Phụ đề
              </button>
            </div>

            <div style={{ padding: 'var(--space-md)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Bước 2: Dán kết quả từ AI</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Copy toàn bộ đoạn JSON mà AI trả về và dán vào ô dưới đây, sau đó bấm Cập nhật.
              </p>
              <textarea
                className="input"
                style={{ width: '100%', height: '150px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px', marginBottom: '10px' }}
                placeholder='Dán đoạn mã {"translations": [...]} vào đây...'
                value={aiResult}
                onChange={(e) => setAiResult(e.target.value)}
              />
              <button
                className="btn btn-secondary"
                onClick={handleApplyAiResult}
                disabled={!aiResult.trim()}
                style={{ width: '100%' }}
              >
                <Sparkles size={16} /> Cập nhật Phụ đề
              </button>
            </div>
          </div>

          <div className="section-divider" />
          <div className="section-title">📋 Kết quả dịch</div>
          <div style={{ overflowX: 'auto' }}>
                <table className="translation-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tiếng Trung</th>
                      <th>Tiếng Việt</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((seg) => (
                      <tr key={seg.id}>
                        <td style={{ color: 'var(--purple-400)', fontWeight: 700 }}>{seg.index}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>{seg.text_zh}</td>
                        <td>
                          <input 
                            className="input" 
                            style={{ width: '100%', padding: '4px 8px', fontSize: '14px' }}
                            value={seg.text_vi}
                            onChange={(e) => updateSegment(seg.id, { text_vi: e.target.value })}
                            placeholder="Nhập bản dịch..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        </div>
      </div>
    </>
  );
}

export default Step5Translation;
