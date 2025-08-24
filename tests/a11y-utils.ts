import { AxeBuilder } from 'axe-core';

export async function checkA11y(container: HTMLElement) {
  const a11y = new AxeBuilder({ element: container });
  const results = await a11y.analyze();

  if (results.violations.length > 0) {
    console.error('Accessibility violations found:', results.violations);
    throw new Error('Accessibility violations found');
  }
}
