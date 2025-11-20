
import React, { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';

// Declare A-Frame elements to fix TypeScript errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': any;
      'a-assets': any;
      'a-asset-item': any;
      'a-sky': any;
      'a-plane': any;
      'a-entity': any;
      'a-camera': any;
      'a-cursor': any;
      'a-gltf-model': any;
      'a-animation': any;
      'a-text': any;
      'a-light': any;
      'a-box': any;
      'a-sphere': any;
    }
  }
}

interface VREntityProps {
  children: React.ReactNode;
  position?: string;
  rotation?: string;
  scale?: string;
}

const VREntity: React.FC<VREntityProps> = ({ children, position = "0 0 0", rotation = "0 0 0", scale = "1 1 1" }) => {
  const elRef = useRef<any>(null); // Ref for the <a-entity>
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const isMountedRef = useRef(false);
  const [isEntityLoaded, setIsEntityLoaded] = useState(false);

  // Effect to manage the lifecycle of the offscreen DOM container and React root
  useEffect(() => {
    isMountedRef.current = true;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.background = 'transparent';
    container.style.fontFamily = 'sans-serif';
    document.body.appendChild(container);
    
    containerRef.current = container;
    rootRef.current = createRoot(container);

    // On unmount, clean everything up
    return () => {
      isMountedRef.current = false;
      
      const entity = elRef.current;
      const root = rootRef.current;
      const container = containerRef.current;

      // Immediately tell A-Frame to remove the component. This starts its cleanup.
      if (entity && entity.hasAttribute('htmlembed')) {
          entity.removeAttribute('htmlembed');
      }
      
      // Defer the rest of the cleanup to the next event loop tick.
      // This gives the aframe-htmlembed-component a chance to finish its
      // own cleanup before we remove the DOM container it depends on,
      // preventing a race condition.
      setTimeout(() => {
        if (root) {
            root.unmount();
            rootRef.current = null;
        }
        if (container?.parentNode) {
            container.parentNode.removeChild(container);
            containerRef.current = null;
        }
      }, 0);
    };
  }, []);

  // Effect to track when the A-Frame entity has been loaded
  useEffect(() => {
    const entity = elRef.current;
    if (!entity) return;

    const handleLoaded = () => {
      if (isMountedRef.current) {
        setIsEntityLoaded(true);
      }
    };

    if (entity.hasLoaded) {
      handleLoaded();
    } else {
      entity.addEventListener('loaded', handleLoaded, { once: true });
    }

    return () => {
      entity.removeEventListener('loaded', handleLoaded);
    };
  }, []);

  // Effect to render children and update the A-Frame entity
  useEffect(() => {
    if (!isEntityLoaded || !isMountedRef.current) {
      return; // Don't proceed until the A-Frame entity is fully loaded
    }

    const root = rootRef.current;
    const entity = elRef.current;
    const container = containerRef.current;

    if (!root || !entity || !container) {
        return;
    }

    flushSync(() => {
        root.render(<React.StrictMode><div>{children}</div></React.StrictMode>);
    });
    
    updateAFrameEntity(entity, container, scale);

  }, [children, scale, isEntityLoaded]);

  const updateAFrameEntity = (entity: any, container: HTMLDivElement, scale: string) => {
    if (!isMountedRef.current || !entity || !container) return;

    const measuredEl = container.firstChild as HTMLElement;
    if (measuredEl && measuredEl.offsetWidth > 0 && measuredEl.offsetHeight > 0) {
        const { offsetWidth, offsetHeight } = measuredEl;
        const [scaleX] = scale.split(' ').map(Number);
        const aspectRatio = offsetHeight / offsetWidth;
        
        entity.setAttribute('geometry', {
            primitive: 'plane',
            width: scaleX,
            height: scaleX * aspectRatio,
        });
    } else {
        const [scaleX, scaleY] = scale.split(' ').map(Number);
        entity.setAttribute('geometry', {
            primitive: 'plane',
            width: scaleX,
            height: scaleY || scaleX,
        });
    }
    
    entity.setAttribute('htmlembed', { asset: container, ppi: 512 });
  };

  return (
    <a-entity
      ref={elRef}
      position={position}
      rotation={rotation}
    ></a-entity>
  );
};

export default VREntity;
