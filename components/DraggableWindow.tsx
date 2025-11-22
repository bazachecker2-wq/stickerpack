
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
    
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState('');

    const dragStartOffset = useRef({ x: 0, y: 0 });
    const resizeStartSize = useRef({ width: 0, height: 0 });
    const resizeStartPos = useRef({ x: 0, y: 0 });
    const resizeStartMouse = useRef({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onFocus(id);
        // Mobile Optimization: Check if window is off-screen initially
        if (window.innerWidth < 768) {
            setPos({ x: Math.max(0, Math.min(pos.x, window.innerWidth - 50)), y: Math.max(0, Math.min(pos.y, window.innerHeight - 100)) });
            // Cap size on mobile
            if (size.width > window.innerWidth) setSize({ ...size, width: window.innerWidth - 20 });
        }
    }, []); // eslint-disable-line

    const handleStartDrag = (clientX: number, clientY: number) => {
        if (isMaximized) return;
        onFocus(id);
        setIsDragging(true);
        dragStartOffset.current = { x: clientX - pos.x, y: clientY - pos.y };
    };

    const handleStartResize = (clientX: number, clientY: number, handle: string) => {
        if (isMaximized) return;
        onFocus(id);
        setIsResizing(true);
        setResizeHandle(handle);
        resizeStartSize.current = size;
        resizeStartPos.current = pos;
        resizeStartMouse.current = { x: clientX, y: clientY };
    };

    const handleMove = useCallback((clientX: number, clientY: number) => {
        if (isDragging) {
            const containerW = window.innerWidth;
            const containerH = window.innerHeight;
            let newX = clientX - dragStartOffset.current.x;
            let newY = clientY - dragStartOffset.current.y;
            
            // Constrain to screen bounds
            newY = Math.max(0, Math.min(newY, containerH - 40));
            newX = Math.max(-size.width + 50, Math.min(newX, containerW - 50));
            
            setPos({ x: newX, y: newY });
        } else if (isResizing) {
            const dx = clientX - resizeStartMouse.current.x;
            const dy = clientY - resizeStartMouse.current.y;
            
            let newWidth = resizeStartSize.current.width;
            let newHeight = resizeStartSize.current.height;
            
            if (resizeHandle.includes('e')) newWidth = Math.max(280, Math.min(window.innerWidth - pos.x, resizeStartSize.current.width + dx));
            if (resizeHandle.includes('s')) newHeight = Math.max(200, Math.min(window.innerHeight - pos.y - 48, resizeStartSize.current.height + dy));
            
            setSize({ width: newWidth, height: newHeight });
        }
    }, [isDragging, isResizing, resizeHandle, size.width, pos.x, pos.y]);

    const handleEnd = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    // Mouse Handlers
    const onMouseDownDrag = (e: React.MouseEvent) => {
        if((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        handleStartDrag(e.clientX, e.clientY);
    };
    const onMouseDownResize = (e: React.MouseEvent, handle: string) => {
        e.stopPropagation();
        e.preventDefault();
        handleStartResize(e.clientX, e.clientY, handle);
    };

    // Touch Handlers
    const onTouchStartDrag = (e: React.TouchEvent) => {
        if((e.target as HTMLElement).closest('button')) return;
        // e.preventDefault(); // Don't prevent default here to allow some interactions, or be careful
        handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStartResize = (e: React.TouchEvent, handle: string) => {
        e.stopPropagation();
        handleStartResize(e.touches[0].clientX, e.touches[0].clientY, handle);
    };


    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
        
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, isResizing, handleMove, handleEnd]);
    
    useEffect(() => {
        if (isMaximized) {
            setPos({ x: 0, y: 0 });
            setSize({ width: window.innerWidth, height: window.innerHeight - 48 });
        }
    }, [isMaximized]);

    if (isMinimized) return null;

    return (
        <div
            ref={windowRef}
            className={`
                fixed flex flex-col bg-white overflow-hidden border-2 border-black
                ${isActive ? 'shadow-hard z-50' : 'shadow-sm z-10'}
            `}
            style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                zIndex: zIndex,
                touchAction: 'none'
            }}
            onMouseDown={() => onFocus(id)}
            onTouchStart={() => onFocus(id)}
        >
            {/* Classic Window Header */}
            <div
                className={`
                    flex items-center justify-between px-2 py-2 select-none border-b-2 border-black touch-none
                    ${isActive ? 'bg-[#000080] text-white' : 'bg-[#808080] text-[#c0c0c0]'}
                `}
                onMouseDown={onMouseDownDrag}
                onTouchStart={onTouchStartDrag}
            >
                <div className="flex items-center gap-2 pointer-events-none">
                     <img src={iconUrl} className="w-4 h-4" alt="" />
                     <span className="text-xs font-bold tracking-wide uppercase truncate max-w-[150px]">{title}</span>
                </div>
                
                <div className="flex items-center gap-1">
                     <button onClick={() => onMinimize(id)} className="w-6 h-6 flex items-center justify-center bg-[#c0c0c0] text-black border-t-2 border-l-2 border-white border-r-2 border-b-2 border-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white leading-none pb-1 font-bold">_</button>
                     <button onClick={() => onMaximize(id)} className="w-6 h-6 flex items-center justify-center bg-[#c0c0c0] text-black border-t-2 border-l-2 border-white border-r-2 border-b-2 border-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white leading-none pb-1 font-bold">□</button>
                     <button onClick={() => onClose(id)} className="w-6 h-6 flex items-center justify-center bg-[#c0c0c0] text-black border-t-2 border-l-2 border-white border-r-2 border-b-2 border-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white leading-none pb-1 font-bold">×</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-[#c0c0c0] relative flex flex-col p-1">
                 <div className="flex-1 bg-white border-2 border-[#808080] border-r-white border-b-white shadow-[inset_1px_1px_0px_0px_#000000] overflow-hidden flex flex-col relative">
                    {!isActive && <div className="absolute inset-0 bg-white/10 z-10 pointer-events-none" />}
                    {children}
                 </div>
            </div>

            {/* Resize Handles */}
            {!isMaximized && (
                <div 
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 bg-[#c0c0c0] touch-none flex items-end justify-end" 
                    onMouseDown={e => onMouseDownResize(e, 'se')}
                    onTouchStart={e => onTouchStartResize(e, 'se')}
                >
                     <div className="w-4 h-4 relative mr-0.5 mb-0.5">
                        <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-b-[12px] border-b-[#808080]"></div>
                        <div className="absolute bottom-1 right-1 w-0 h-0 border-l-[8px] border-l-transparent border-b-[8px] border-b-[#ffffff]"></div>
                     </div>
                </div>
            )}
        </div>
    );
};

export default DraggableWindow;
