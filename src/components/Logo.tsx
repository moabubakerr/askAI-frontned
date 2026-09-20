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
/*
 * Cropped to the artwork's own ink box, measured from the file: x 157–1997,
 * y 159–767 of 2153×928. The JPEG carries wide white margins which the filter
 * correctly drops, but which would otherwise eat a third of whatever height the
 * header gives it.
 *
 * Within that box the four bands are the crest (345px), the Arabic wordmark
 * (88px), the English wordmark (76px) and "State of Qatar" (44px). Those ratios
 * are what set the header height: at anything under ~56px of rendered lockup
 * the two wordmarks stop being readable.
 */
const VIEWBOX = '147 149 1860 628';

export function Logo({ title }: { title: string }) {
  const id = useId();
  const filterId = `scai-logo-${id}`;

  return (
    <svg
      className={styles.logo}
      viewBox={VIEWBOX}
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
          <feFuncA type="linear" slope="8" intercept="-0.35" />
        </feComponentTransfer>
        <feFlood floodColor="currentColor" result="ink" />
        <feComposite in="ink" in2="clipped" operator="in" />
      </filter>

      <image href={logoUrl} width="2153" height="928" filter={`url(#${filterId})`} />
    </svg>
  );
}
