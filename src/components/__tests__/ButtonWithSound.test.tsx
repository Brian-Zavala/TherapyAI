import React from 'react';
import { render, screen } from '@testing-library/react';
import { ButtonWithSound } from '../ButtonWithSound';
import { checkA11y } from '../../tests/a11y-utils';

describe('ButtonWithSound', () => {
  it('should be accessible', async () => {
    const { container } = render(<ButtonWithSound>Click me</ButtonWithSound>);
    await checkA11y(container);
  });
});
