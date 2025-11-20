import React, { useState, useRef, useEffect, useCallback } from 'react';

interface DraggableWindowProps {
    id: string;
    title: string;
    iconUrl: string;
    children: React.ReactNode;
    initialPos: { x: number; y: number };
    initialSize: { width: number; height: number };
    zIndex: number;
    isActive: boolean;
    isMinimized: boolean;
    isMaximized: boolean;
    onClose: (id: string) => void;
    onFocus: (id: string) => void;
    onMinimize: (id: string) => void;
    onMaximize: (id: string) => void;
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({
    id, title, iconUrl, children, initialPos, initialSize, zIndex, isActive, isMinimized, isMaximized,
    onClose, onFocus, onMinimize, onMaximize
}) => {
    const [pos, setPos] = useState(initialPos);
    const [size, setSize] = useState(initialSize);
    
    const [prevPos, setPrevPos] = useState(initialPos);
    const [prevSize, setPrevSize] = useState(initialSize);

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState('');

    const dragStartOffset = useRef({ x: 0, y: 0 });
    const resizeStartSize = useRef({ width: 0, height: 0 });
    const resizeStartPos = useRef({ x: 0, y: 0 });
    const resizeStartMouse = useRef({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);

    const handleMouseDownDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isMaximized || (e.target as HTMLElement).closest('.title-bar-button')) return;
        onFocus(id);
        setIsDragging(true);
        dragStartOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };
    
    const handleMouseDownResize = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
        if (isMaximized) return;
        e.stopPropagation();
        onFocus(id);
        setIsResizing(true);
        setResizeHandle(handle);
        resizeStartSize.current = size;
        resizeStartPos.current = pos;
        resizeStartMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const desktop = document.querySelector('.desktop') as HTMLElement;
        if (!desktop) return;
        const desktopRect = desktop.getBoundingClientRect();

        if (isDragging) {
            let newX = e.clientX - dragStartOffset.current.x;
            let newY = e.clientY - dragStartOffset.current.y;
            
            newX = Math.max(0, Math.min(newX, desktopRect.width - size.width));
            newY = Math.max(0, Math.min(newY, desktopRect.height - 22));
            
            setPos({ x: newX, y: newY });
        } else if (isResizing) {
            const dx = e.clientX - resizeStartMouse.current.x;
            const dy = e.clientY - resizeStartMouse.current.y;
            
            let newWidth = resizeStartSize.current.width;
            let newHeight = resizeStartSize.current.height;
            let newX = resizeStartPos.current.x;
            let newY = resizeStartPos.current.y;
            
            if (resizeHandle.includes('e')) newWidth = Math.max(200, resizeStartSize.current.width + dx);
            if (resizeHandle.includes('s')) newHeight = Math.max(150, resizeStartSize.current.height + dy);
            if (resizeHandle.includes('w')) {
                const calculatedWidth = resizeStartSize.current.width - dx;
                if (calculatedWidth >= 200) {
                    newWidth = calculatedWidth;
                    newX = resizeStartPos.current.x + dx;
                }
            }
            if (resizeHandle.includes('n')) {
                 const calculatedHeight = resizeStartSize.current.height - dy;
                 if (calculatedHeight >= 150) {
                    newHeight = calculatedHeight;
                    newY = resizeStartPos.current.y + dy;
                 }
            }
            
            setSize({ width: newWidth, height: newHeight });
            setPos({ x: newX, y: newY });
        }
    }, [isDragging, isResizing, resizeHandle, size.width]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);
    
    const handleMaximizeClick = () => {
        if (!isMaximized) {
            setPrevPos(pos);
            setPrevSize(size);
        }
        onMaximize(id);
    };

    useEffect(() => {
        if (isMaximized) {
            const desktop = document.querySelector('.desktop');
            if (desktop) {
                setPos({ x: 0, y: 0 });
                setSize({ width: desktop.clientWidth, height: desktop.clientHeight });
            }
        } else {
             // Check if it was maximized before to restore
            if (pos.x === 0 && pos.y === 0) {
               setPos(prevPos);
               setSize(prevSize);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMaximized]);

    if (isMinimized) return null;
    
    // U+2_ denotes a unicode character, used here for window icons
    const maximizeIcon = String.fromCharCode(0x1F5D6); 
    const restoreIcon = String.fromCharCode(0x1F5D7);

    return (
        <div
            ref={windowRef}
            className="draggable-window"
            style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                zIndex,
            }}
            onMouseDown={() => onFocus(id)}
        >
            <div
                className={isActive ? "title-bar" : "title-bar title-bar-inactive"}
                onMouseDown={handleMouseDownDrag}
                onDoubleClick={handleMaximizeClick}
            >
                <div className="title-bar-text">
                    <img src={iconUrl} alt="" style={{ width: '16px', height: '16px' }} />
                    <span>{title}</span>
                </div>
                <div className="title-bar-controls">
                    <button onClick={() => onMinimize(id)} className="title-bar-button">_</button>
                    <button onClick={handleMaximizeClick} className="title-bar-button">
                       {isMaximized ? restoreIcon : maximizeIcon}
                    </button> 
                    <button onClick={() => onClose(id)} className="title-bar-button">×</button>
                </div>
            </div>
            <div className="window-content">
                {children}
            </div>
             {!isMaximized && (
                <>
                    <div className="resize-handle resize-handle-n" onMouseDown={e => handleMouseDownResize(e, 'n')}></div>
                    <div className="resize-handle resize-handle-s" onMouseDown={e => handleMouseDownResize(e, 's')}></div>
                    <div className="resize-handle resize-handle-e" onMouseDown={e => handleMouseDownResize(e, 'e')}></div>
                    <div className="resize-handle resize-handle-w" onMouseDown={e => handleMouseDownResize(e, 'w')}></div>
                    <div className="resize-handle resize-handle-nw" onMouseDown={e => handleMouseDownResize(e, 'nw')}></div>
                    <div className="resize-handle resize-handle-ne" onMouseDown={e => handleMouseDownResize(e, 'ne')}></div>
                    <div className="resize-handle resize-handle-sw" onMouseDown={e => handleMouseDownResize(e, 'sw')}></div>
                    <div className="resize-handle resize-handle-se" onMouseDown={e => handleMouseDownResize(e, 'se')}></div>
                </>
             )}
        </div>
    );
};

export default DraggableWindow;