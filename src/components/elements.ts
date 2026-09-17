import type { AnswerElement, ElementClass, ElementRole } from '../api/types';
import type { MsgKey } from '../i18n/en';

/** Role picks the layout slot. Nothing here looks at `class`. */
export function byRole(elements: AnswerElement[], role: ElementRole): AnswerElement[] {
  return elements.filter((element) => element.role === role);
}

export function firstByRole(
  elements: AnswerElement[],
  role: ElementRole,
): AnswerElement | undefined {
  return elements.find((element) => element.role === role);
}

/** Class picks the visual treatment. Nothing here looks at `role`. */
export const CLASS_LABEL: Record<ElementClass, MsgKey> = {
  measured: 'class.measured',
  derived: 'class.derived',
  attributed: 'class.attributed',
  article: 'class.article',
  external: 'class.external',
  absent: 'class.absent',
};
