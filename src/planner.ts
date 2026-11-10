import { StudioError, parseSpec, type ProjectSpec, styleSchema } from './domain.js';

/** Offline, deterministic draft planner. It does not claim language-model reasoning. */
export function planScript(
  script: string,
  title = 'Untitled',
  style: unknown = 'paper-cut',
  language: 'vi' | 'en' = 'vi',
): { spec: ProjectSpec; notes: string[] } {
  if (typeof script !== 'string' || !script.trim() || script.length > 12000)
    throw new StudioError('INVALID_SCRIPT', 'Kịch bản cần 1–12.000 ký tự.');
  const parsedStyle = styleSchema.safeParse(style);
  if (!parsedStyle.success) throw new StudioError('INVALID_STYLE', 'Phong cách không được hỗ trợ.');
  const blocks = script
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);
  if (blocks.length > 12)
    throw new StudioError('TOO_MANY_SCENES', 'Tối đa 12 cảnh; ngăn cách các cảnh bằng dòng trống.');
  const notes = [
    'Planner offline tạo bản nháp theo đoạn và chỉ dẫn. Kiểm tra hành động, lời dẫn và timing trước khi render.',
  ];
  const scenes = blocks.map((block, i) => {
    const directive = /^\s*\[([^\]]+)\]\s*/.exec(block);
    const options: Record<string, string> = {};
    if (directive)
      for (const pair of directive[1]!.split(';')) {
        const [k, ...v] = pair.split('=');
        if (!k?.trim() || !v.length || !v.join('=').trim())
          throw new StudioError(
            'INVALID_DIRECTIVE',
            'Chỉ dẫn cần dạng key=value, ngăn cách bằng dấu ;.',
          );
        if (k.trim() in options)
          throw new StudioError('DUPLICATE_DIRECTIVE', `Chỉ dẫn bị lặp: ${k.trim()}`);
        options[k.trim()] = v.join('=').trim();
      }
    for (const key of Object.keys(options))
      if (!['title', 'action', 'camera', 'seconds', 'color'].includes(key))
        throw new StudioError('UNKNOWN_DIRECTIVE', `Chỉ dẫn chưa hỗ trợ: ${key}`);
    const narration = block.slice(directive?.[0].length ?? 0).trim();
    const normalized = narration
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase();
    let inferred = 'talk';
    if (/nhac|cam coc|pick|cup/.test(normalized)) inferred = 'pick-up';
    else if (/di bo|buoc di|walk/.test(normalized)) inferred = 'walk';
    else if (/vay tay|chao|wave|hello/.test(normalized)) inferred = 'wave';
    const seconds = options.seconds
      ? Number(options.seconds)
      : Math.min(30, Math.max(4, Math.ceil(narration.split(/\s+/).length / 2.5) + 1));
    if (options.seconds && !Number.isFinite(seconds))
      throw new StudioError('INVALID_DURATION', 'seconds cần là số hữu hạn.');
    if (!options.action)
      notes.push(`Cảnh ${i + 1}: action=${inferred} là suy luận quy tắc, có thể chỉnh lại.`);
    return {
      id: `s${String(i + 1).padStart(3, '0')}`,
      title: options.title ?? `Cảnh ${i + 1}`,
      narration,
      durationFrames: Math.round(seconds * 24),
      action: options.action ?? inferred,
      camera: options.camera ?? 'static',
      color: options.color ?? '#527e88',
    };
  });
  return {
    spec: parseSpec({
      schemaVersion: '1.0',
      title,
      style: parsedStyle.data,
      fps: 24,
      language,
      scenes,
    }),
    notes,
  };
}
