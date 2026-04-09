import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote, 
  Link, 
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  ChevronDown,
  Plus
} from 'lucide-react';
import MediaLibraryModal from './MediaLibraryModal';
import { apiClient, MediaFile } from '../services/api';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your content here...",
  className = ""
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showImageSourceMenu, setShowImageSourceMenu] = useState(false);
  const [showUrlInsertMenu, setShowUrlInsertMenu] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [urlPreviewHtml, setUrlPreviewHtml] = useState('');
  const [urlPreviewValid, setUrlPreviewValid] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [blockFormat, setBlockFormat] = useState('P');

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      // Add resize handles to existing images
      setTimeout(() => {
        addImageResizeHandles();
      }, 100);
    }
  }, [value]);

  useEffect(() => {
    // Add resize handles when component mounts
    setTimeout(() => {
      addImageResizeHandles();
    }, 100);
  }, []);

  const normalizeFormatTag = (tagName: string | undefined) => {
    if (!tagName) return 'P';
    const normalized = tagName.toUpperCase();
    if (['P', 'H2', 'H3', 'H4', 'BLOCKQUOTE'].includes(normalized)) {
      return normalized;
    }
    return 'P';
  };

  const detectCurrentBlockFormat = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setBlockFormat('P');
      return;
    }

    let node: Node | null = selection.focusNode;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && /^(P|H2|H3|H4|BLOCKQUOTE)$/i.test(node.tagName)) {
        setBlockFormat(normalizeFormatTag(node.tagName));
        return;
      }
      node = node.parentNode;
    }

    setBlockFormat('P');
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
    detectCurrentBlockFormat();
  };

  const getServerBaseUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return apiUrl.replace('/api', '');
  };

  const normalizeImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return url;
    if (url.startsWith('/')) return `${getServerBaseUrl()}${url}`;
    return `${getServerBaseUrl()}/${url}`;
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    } else {
      console.error('Editor reference is null in handleContentChange');
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedContent = e.target.value;
    onChange(updatedContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = updatedContent;
    }
  };

  const applyFormatBlock = (format: string) => {
    execCommand('formatBlock', format === 'P' ? 'p' : format.toLowerCase());
  };

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const sanitizePastedHtml = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('script, style, meta, link').forEach((node) => node.remove());

    const blockedAttributes = [
      'style',
      'bgcolor',
      'color',
      'face',
      'size',
      'width',
      'height',
      'align',
      'valign'
    ];

    doc.body.querySelectorAll('*').forEach((element) => {
      blockedAttributes.forEach((attr) => {
        if (element.hasAttribute(attr)) {
          element.removeAttribute(attr);
        }
      });

      if (element.hasAttribute('class')) {
        element.removeAttribute('class');
      }

      if (element.tagName === 'SPAN' && element.attributes.length === 0) {
        const parent = element.parentNode;
        while (element.firstChild) {
          parent?.insertBefore(element.firstChild, element);
        }
        parent?.removeChild(element);
      }
    });

    return doc.body.innerHTML;
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();

    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      const cleanedHtml = sanitizePastedHtml(html);
      document.execCommand('insertHTML', false, cleanedHtml);
    } else if (text) {
      const safeText = escapeHtml(text).replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, safeText);
    }

    handleContentChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'k':
          e.preventDefault();
          insertLink();
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            execCommand('redo');
          } else {
            execCommand('undo');
          }
          break;
      }
    }
  };

  const insertImageBlock = (imageUrl: string, defaultAlt: string = 'Inserted image') => {
    const safeImageUrl = escapeHtml(imageUrl);
    const safeAlt = escapeHtml(defaultAlt);

    const imageBlockHtml = `
      <div class="image-text-block" style="margin: 10px 0;">
        <img src="${safeImageUrl}" alt="${safeAlt}" class="resizable-image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; display: block;" data-original-width="400" data-original-height="300" />
      </div>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, imageBlockHtml);
    editorRef.current?.focus();
    handleContentChange();
    setTimeout(() => {
      addImageResizeHandles();
    }, 100);
  };

  const chooseImageFromLibrary = () => {
    setShowImageSourceMenu(false);
    setShowMediaLibrary(true);
  };

  const chooseImageFromComputer = () => {
    setShowImageSourceMenu(false);
    fileInputRef.current?.click();
  };

  const handleMediaSelect = (media: MediaFile) => {
    const imageUrl = normalizeImageUrl(media.url);
    insertImageBlock(imageUrl, media.originalName || 'Inserted image');
  };

  const handleComputerFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('files', file);
      const uploaded = await apiClient.uploadMediaFiles(formData);
      const uploadedFile = uploaded[0];

      if (!uploadedFile) {
        alert('Upload failed. Please try again.');
        return;
      }

      const imageUrl = normalizeImageUrl(uploadedFile.url);
      insertImageBlock(imageUrl, uploadedFile.originalName || file.name);
    } catch (error) {
      console.error('Failed to upload selected image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const insertLink = () => {
    setShowUrlInsertMenu((prev) => !prev);
  };

  const getYouTubeVideoId = (url: string) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');

      if (host === 'youtu.be') {
        return parsed.pathname.split('/').filter(Boolean)[0] || null;
      }

      if (host.includes('youtube.com')) {
        const id = parsed.searchParams.get('v');
        if (id) return id;

        const parts = parsed.pathname.split('/').filter(Boolean);
        const markerIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts');
        if (markerIndex !== -1 && parts[markerIndex + 1]) {
          return parts[markerIndex + 1];
        }
      }
    } catch {
      return null;
    }

    return null;
  };

  const buildEmbedHtmlFromUrl = (rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return '';

    const youtubeId = getYouTubeVideoId(url);
    if (youtubeId) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://umunsi.com';
      const params = `rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(origin)}`;
      return `
        <div class="not-prose my-6 overflow-hidden rounded-xl border border-[#2b2f36] bg-[#0b0e11]">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${youtubeId}?${params}"
            title="YouTube video"
            class="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
      `;
    }

    if (/(^https?:\/\/)?(www\.)?instagram\.com\//i.test(url)) {
      return `
        <blockquote class="instagram-media not-prose my-6" data-instgrm-permalink="${url}" data-instgrm-version="14">
          <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
        </blockquote>
      `;
    }

    if (/(^https?:\/\/)?(www\.)?(x\.com|twitter\.com)\//i.test(url)) {
      return `
        <blockquote class="twitter-tweet not-prose my-6">
          <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
        </blockquote>
      `;
    }

    return `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`;
  };

  const handleGenerateUrlPreview = () => {
    const embed = buildEmbedHtmlFromUrl(urlInputValue);
    setUrlPreviewHtml(embed || '<p class="text-gray-400">Invalid URL</p>');
    setUrlPreviewValid(Boolean(embed));
  };

  const handleInsertUrlEmbed = () => {
    const embed = buildEmbedHtmlFromUrl(urlInputValue);
    if (!embed) return;

    document.execCommand('insertHTML', false, `${embed}<p><br></p>`);
    editorRef.current?.focus();
    handleContentChange();
    setShowUrlInsertMenu(false);
    setUrlInputValue('');
    setUrlPreviewHtml('');
    setUrlPreviewValid(false);
  };

  const addImageResizeHandles = () => {
    if (!editorRef.current) return;

    const images = editorRef.current.querySelectorAll('.resizable-image');
    images.forEach((img: Element) => {
      const imageElement = img as HTMLImageElement;
      
      // Skip if already has resize handles
      if (imageElement.parentElement?.classList.contains('image-container')) return;

      // Create container
      const container = document.createElement('div');
      container.className = 'image-container';
      container.style.position = 'relative';
      container.style.display = 'inline-block';
      container.style.maxWidth = '100%';

      // Wrap image in container
      imageElement.parentNode?.insertBefore(container, imageElement);
      container.appendChild(imageElement);

      // Add resize handles
      addResizeHandles(container, imageElement);
      
      // Add click handler for selection
      imageElement.addEventListener('click', (e) => {
        e.preventDefault();
        selectImage(container);
      });
    });
  };

  const addResizeHandles = (container: HTMLElement, image: HTMLImageElement) => {
    // Create resize handles
    const handles = ['nw', 'ne', 'sw', 'se'];
    
    handles.forEach(handle => {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = `resize-handle resize-handle-${handle}`;
      resizeHandle.style.position = 'absolute';
      resizeHandle.style.width = '8px';
      resizeHandle.style.height = '8px';
      resizeHandle.style.backgroundColor = '#007cba';
      resizeHandle.style.border = '1px solid #fff';
      resizeHandle.style.cursor = `${handle}-resize`;
      resizeHandle.style.zIndex = '1000';
      resizeHandle.style.opacity = '0';
      resizeHandle.style.transition = 'opacity 0.2s';

      // Position handles
      switch (handle) {
        case 'nw':
          resizeHandle.style.top = '-4px';
          resizeHandle.style.left = '-4px';
          break;
        case 'ne':
          resizeHandle.style.top = '-4px';
          resizeHandle.style.right = '-4px';
          break;
        case 'sw':
          resizeHandle.style.bottom = '-4px';
          resizeHandle.style.left = '-4px';
          break;
        case 'se':
          resizeHandle.style.bottom = '-4px';
          resizeHandle.style.right = '-4px';
          break;
      }

      container.appendChild(resizeHandle);

      // Add resize functionality
      let isResizing = false;
      let startX = 0;
      let startY = 0;
      let startWidth = 0;
      let startHeight = 0;

      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = image.offsetWidth;
        startHeight = image.offsetHeight;

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
      });

      const handleResize = (e: MouseEvent) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        let newWidth = startWidth;
        let newHeight = startHeight;

        // Calculate new dimensions based on handle
        switch (handle) {
          case 'se':
            newWidth = startWidth + deltaX;
            newHeight = startHeight + deltaY;
            break;
          case 'sw':
            newWidth = startWidth - deltaX;
            newHeight = startHeight + deltaY;
            break;
          case 'ne':
            newWidth = startWidth + deltaX;
            newHeight = startHeight - deltaY;
            break;
          case 'nw':
            newWidth = startWidth - deltaX;
            newHeight = startHeight - deltaY;
            break;
        }

        // Maintain aspect ratio and set minimum size
        const minSize = 50;
        const maxSize = 800;
        newWidth = Math.max(minSize, Math.min(maxSize, newWidth));
        newHeight = Math.max(minSize, Math.min(maxSize, newHeight));

        // Apply new dimensions
        image.style.width = `${newWidth}px`;
        image.style.height = `${newHeight}px`;
        image.style.maxWidth = 'none';
      };

      const stopResize = () => {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };
    });

    // Add image controls
    addImageControls(container, image);
  };

  const addImageControls = (container: HTMLElement, image: HTMLImageElement) => {
    // Create controls bar
    const controls = document.createElement('div');
    controls.className = 'image-controls';
    controls.style.position = 'absolute';
    controls.style.top = '-30px';
    controls.style.left = '0';
    controls.style.backgroundColor = '#007cba';
    controls.style.color = 'white';
    controls.style.padding = '4px 8px';
    controls.style.borderRadius = '4px';
    controls.style.fontSize = '12px';
    controls.style.opacity = '0';
    controls.style.transition = 'opacity 0.2s';
    controls.style.zIndex = '1001';
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    controls.style.alignItems = 'center';

    // Add control buttons
    const alignLeft = createControlButton('⬅', 'Align Left', () => alignImage(image, 'left'));
    const alignCenter = createControlButton('⬆', 'Align Center', () => alignImage(image, 'center'));
    const alignRight = createControlButton('➡', 'Align Right', () => alignImage(image, 'right'));
    const deleteBtn = createControlButton('🗑', 'Delete Image', () => deleteImage(container));

    controls.appendChild(alignLeft);
    controls.appendChild(alignCenter);
    controls.appendChild(alignRight);
    controls.appendChild(deleteBtn);

    container.appendChild(controls);
  };

  const createControlButton = (icon: string, title: string, onClick: () => void) => {
    const button = document.createElement('button');
    button.innerHTML = icon;
    button.title = title;
    button.style.background = 'none';
    button.style.border = 'none';
    button.style.color = 'white';
    button.style.cursor = 'pointer';
    button.style.padding = '2px';
    button.style.borderRadius = '2px';
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(255,255,255,0.2)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });
    return button;
  };

  const selectImage = (container: HTMLElement) => {
    // Remove selection from other images
    const allContainers = editorRef.current?.querySelectorAll('.image-container');
    allContainers?.forEach(c => {
      c.classList.remove('selected');
      const handles = c.querySelectorAll('.resize-handle');
      const controls = c.querySelector('.image-controls') as HTMLElement;
      handles.forEach(h => (h as HTMLElement).style.opacity = '0');
      if (controls) controls.style.opacity = '0';
    });

    // Select current image
    container.classList.add('selected');
    const handles = container.querySelectorAll('.resize-handle');
    const controls = container.querySelector('.image-controls') as HTMLElement;
    handles.forEach(h => (h as HTMLElement).style.opacity = '1');
    if (controls) controls.style.opacity = '1';
  };

  const alignImage = (image: HTMLImageElement, alignment: string) => {
    const container = image.parentElement;
    if (!container) return;

    // Remove existing alignment classes
    container.classList.remove('align-left', 'align-center', 'align-right');
    
    // Add new alignment
    container.classList.add(`align-${alignment}`);
    
    // Apply alignment styles
    switch (alignment) {
      case 'left':
        container.style.textAlign = 'left';
        break;
      case 'center':
        container.style.textAlign = 'center';
        break;
      case 'right':
        container.style.textAlign = 'right';
        break;
    }
  };

  const deleteImage = (container: HTMLElement) => {
    if (confirm('Are you sure you want to delete this image?')) {
      container.remove();
      handleContentChange();
    }
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    isActive?: boolean;
  }> = ({ onClick, icon, title, isActive = false }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded border transition-colors ${
        isActive
          ? 'bg-[#f0f6fc] border-[#8c8f94] text-[#1d2327]'
          : 'bg-white border-[#dcdcde] text-[#3c434a] hover:bg-[#f6f7f7]'
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className={`rich-text-editor relative border border-[#c3c4c7] rounded-md bg-white shadow-sm ${className}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#dcdcde] bg-[#f6f7f7] rounded-t-md">
        <button
          type="button"
          onClick={() => setShowImageSourceMenu((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded border border-[#2271b1] text-[#2271b1] bg-white hover:bg-[#f0f6fc]"
        >
          <Plus className="w-4 h-4" />
          Add Media
        </button>

        <div className="inline-flex rounded border border-[#c3c4c7] overflow-hidden">
          <button
            type="button"
            onClick={() => setEditorMode('visual')}
            className={`px-4 py-1.5 text-sm font-medium ${editorMode === 'visual' ? 'bg-white text-[#1d2327]' : 'bg-[#f0f0f1] text-[#50575e]'}`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('code')}
            className={`px-4 py-1.5 text-sm font-medium border-l border-[#c3c4c7] ${editorMode === 'code' ? 'bg-white text-[#1d2327]' : 'bg-[#f0f0f1] text-[#50575e]'}`}
          >
            Code
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {editorMode === 'visual' && (
      <div className="relative flex flex-wrap items-center gap-1 p-2 border-b border-[#dcdcde] bg-white">
        <div className="flex items-center gap-2 border-r border-[#dcdcde] pr-2 mr-1">
          <div className="relative">
            <select
              value={blockFormat}
              onChange={(e) => applyFormatBlock(e.target.value)}
              onFocus={detectCurrentBlockFormat}
              className="appearance-none h-8 pl-3 pr-8 text-sm rounded border border-[#8c8f94] bg-white text-[#1d2327]"
              title="Paragraph format"
            >
              <option value="P">Paragraph</option>
              <option value="H2">Heading 2</option>
              <option value="H3">Heading 3</option>
              <option value="H4">Heading 4</option>
              <option value="BLOCKQUOTE">Quote</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 w-4 h-4 text-[#646970]" />
          </div>
        </div>

        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r border-[#dcdcde] pr-2 mr-1">
          <ToolbarButton
            onClick={() => execCommand('bold')}
            icon={<Bold className="w-4 h-4" />}
            title="Bold (Ctrl+B)"
          />
          <ToolbarButton
            onClick={() => execCommand('italic')}
            icon={<Italic className="w-4 h-4" />}
            title="Italic (Ctrl+I)"
          />
          <ToolbarButton
            onClick={() => execCommand('underline')}
            icon={<Underline className="w-4 h-4" />}
            title="Underline (Ctrl+U)"
          />
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-[#dcdcde] pr-2 mr-1">
          <ToolbarButton
            onClick={() => execCommand('insertUnorderedList')}
            icon={<List className="w-4 h-4" />}
            title="Bullet List"
          />
          <ToolbarButton
            onClick={() => execCommand('insertOrderedList')}
            icon={<ListOrdered className="w-4 h-4" />}
            title="Numbered List"
          />
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r border-[#dcdcde] pr-2 mr-1">
          <ToolbarButton
            onClick={() => execCommand('justifyLeft')}
            icon={<AlignLeft className="w-4 h-4" />}
            title="Align Left"
          />
          <ToolbarButton
            onClick={() => execCommand('justifyCenter')}
            icon={<AlignCenter className="w-4 h-4" />}
            title="Align Center"
          />
          <ToolbarButton
            onClick={() => execCommand('justifyRight')}
            icon={<AlignRight className="w-4 h-4" />}
            title="Align Right"
          />
        </div>

        {/* Insert */}
        <div className="flex items-center gap-1 border-r border-[#dcdcde] pr-2 mr-1">
          <ToolbarButton
            onClick={insertLink}
            icon={<Link className="w-4 h-4" />}
            title="Insert/edit link (Ctrl+K)"
          />
          <ToolbarButton
            onClick={() => setShowImageSourceMenu((prev) => !prev)}
            icon={<ImageIcon className="w-4 h-4" />}
            title="Insert Image"
          />
          <ToolbarButton
            onClick={() => applyFormatBlock('BLOCKQUOTE')}
            icon={<Quote className="w-4 h-4" />}
            title="Quote"
          />
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => execCommand('undo')}
            icon={<Undo className="w-4 h-4" />}
            title="Undo (Ctrl+Z)"
          />
          <ToolbarButton
            onClick={() => execCommand('redo')}
            icon={<Redo className="w-4 h-4" />}
            title="Redo (Ctrl+Shift+Z)"
          />
        </div>

        {showImageSourceMenu && (
          <div className="absolute top-12 left-3 z-20 bg-white border border-[#c3c4c7] rounded-md shadow-xl p-2 min-w-[240px]">
            <button
              type="button"
              onClick={chooseImageFromLibrary}
              className="w-full text-left px-3 py-2 rounded text-sm text-[#1d2327] hover:bg-[#f6f7f7]"
            >
              Media Library
            </button>
            <button
              type="button"
              onClick={chooseImageFromComputer}
              className="w-full text-left px-3 py-2 rounded text-sm text-[#1d2327] hover:bg-[#f6f7f7]"
            >
              Upload Files
            </button>
          </div>
        )}

        {showUrlInsertMenu && (
          <div className="absolute top-12 left-20 z-30 bg-white border border-[#c3c4c7] rounded-md shadow-xl p-3 w-[380px]">
            <p className="text-xs text-[#646970] mb-2">Insert URL (YouTube, Instagram, X/Twitter or normal link)</p>
            <input
              type="url"
              value={urlInputValue}
              onChange={(e) => {
                const nextValue = e.target.value;
                setUrlInputValue(nextValue);
                const nextPreview = buildEmbedHtmlFromUrl(nextValue);
                setUrlPreviewHtml(nextPreview || (nextValue.trim() ? '<p class="text-gray-500">Invalid URL</p>' : ''));
                setUrlPreviewValid(Boolean(nextPreview));
              }}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded border border-[#8c8f94] text-sm text-[#1d2327]"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateUrlPreview}
                className="px-3 py-1.5 rounded border border-[#8c8f94] text-[#3c434a] text-xs bg-white hover:bg-[#f6f7f7]"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={handleInsertUrlEmbed}
                disabled={!urlPreviewValid}
                className="px-3 py-1.5 rounded bg-[#2271b1] text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Insert Preview in Article
              </button>
            </div>
            {urlPreviewHtml && (
              <div className="mt-3 border border-[#dcdcde] rounded p-2 max-h-52 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: urlPreviewHtml }} />
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Editor */}
      {editorMode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            detectCurrentBlockFormat();
          }}
          onBlur={() => setIsFocused(false)}
          onMouseUp={detectCurrentBlockFormat}
          onKeyUp={detectCurrentBlockFormat}
          className={`min-h-[360px] p-4 focus:outline-none text-[#1d2327] bg-white rounded-b-md ${
            isFocused ? 'ring-1 ring-[#2271b1] ring-inset' : ''
          }`}
          style={{ minHeight: '360px' }}
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
        />
      ) : (
        <textarea
          value={value}
          onChange={handleCodeChange}
          className="w-full min-h-[360px] p-4 font-mono text-sm border-0 focus:outline-none text-[#1d2327] rounded-b-md"
          placeholder="Write HTML content..."
        />
      )}

      {/* Placeholder */}
      {!value && editorMode === 'visual' && (
        <div className="absolute top-[98px] left-4 text-[#8c8f94] pointer-events-none">
          {placeholder}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleComputerFileSelected}
        className="hidden"
      />

      <MediaLibraryModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaSelect}
        title="Choose Uploaded Image"
        mode="select"
        type="image"
      />

    </div>
  );
};

export default RichTextEditor;
