import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import './PillNav.css';

const PillNav = ({
  items,
  activeId,
  onItemClick,
  className = '',
  ease = 'power2.easeOut',
  baseColor = '#f0f0f0',
  pillColor = '#000000',
  textColor = '#000000',
  activeTextColor = '#ffffff',
}) => {
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  useEffect(() => {
    const activeItemIndex = items.findIndex(item => item.id === activeId);
    const activeItem = itemRefs.current[activeItemIndex];

    if (activeItem && pillRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      gsap.to(pillRef.current, {
        x: itemRect.left - navRect.left,
        width: itemRect.width,
        duration: 0.4,
        ease: ease,
      });
    }
  }, [activeId, items, ease]);

  const handleItemClick = (item) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const navStyle = {
    '--base-color': baseColor,
    '--pill-color': pillColor,
    '--text-color': textColor,
    '--active-text-color': activeTextColor,
  };

  return (
    <nav
      ref={navRef}
      className={`pill-nav ${className}`}
      style={navStyle}
    >
      <div className="pill-nav-items">
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={el => (itemRefs.current[index] = el)}
            className={`pill-nav-item ${item.id === activeId ? 'active' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div ref={pillRef} className="pill-nav-pill" />
    </nav>
  );
};

export default PillNav;