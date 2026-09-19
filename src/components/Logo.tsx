import { useId } from 'react';
import logoUrl from '../assets/scai-logo.jpg';
import styles from './Logo.module.css';

/**
 * The Council's lockup, as SVG.
 *
 * The supplied artwork is a JPEG with a white background, which cannot sit on
 * the navy header: the white would show as a block, and a JPEG carries no
 * transparency to remove it. So the bitmap is placed inside an SVG and run
 * through a filter that builds the alpha channel from luminance — white becomes
 * transparent, the artwork becomes a matte — and then flooded with
 * `currentColor`.
 *
 * That means one asset renders in any colour the surrounding text uses: white
 * on the header here, the brand maroon anywhere on a light surface, with no
 * second file to keep in step. Replace `scai-logo.jpg` with a true vector and
 * this component is the only thing that changes.
 */
export function Logo({ title }: { title: string }) {
  const id = useId();
  const filterId = `scai-logo-${id}`;

  return (
    <svg
      className={styles.logo}
      viewBox="0 0 2153 928"
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
    >
      <filter id={filterId} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        {/* alpha = 1 − luminance, so the white ground drops out. */}
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  -0.2126 -0.7152 -0.0722 0 1"
          result="matte"
        />
        {/* JPEG compression leaves the ground a shade under pure white; this
            clips that haze away and keeps the strokes solid. */}
        <feComponentTransfer in="matte" result="clipped">
          <feFuncA type="linear" slope="6" intercept="-0.25" />
        </feComponentTransfer>
        <feFlood floodColor="currentColor" result="ink" />
        <feComposite in="ink" in2="clipped" operator="in" />
      </filter>

      <image href={logoUrl} width="2153" height="928" filter={`url(#${filterId})`} />
    </svg>
  );
}
