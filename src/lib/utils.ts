import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format family member relation labels for display
 * Capitalizes first letter and handles special cases
 */
export function formatRelationLabel(relation: string): string {
  if (!relation) return 'Family Member';
  
  // Special cases for proper capitalization
  const specialCases: Record<string, string> = {
    // Children
    'son': 'Son',
    'daughter': 'Daughter',
    'child': 'Child (non-binary)',
    
    // Parents
    'mother': 'Mother',
    'father': 'Father',
    'parent': 'Parent (non-binary)',
    
    // Siblings
    'brother': 'Brother',
    'sister': 'Sister',
    'sibling': 'Sibling (non-binary)',
    
    // Grandparents
    'grandmother': 'Grandmother',
    'grandfather': 'Grandfather',
    'grandparent': 'Grandparent (non-binary)',
    
    // Grandchildren
    'grandson': 'Grandson',
    'granddaughter': 'Granddaughter',
    'grandchild': 'Grandchild (non-binary)',
    
    // Step-family
    'stepson': 'Stepson',
    'stepdaughter': 'Stepdaughter',
    'stepchild': 'Stepchild (non-binary)',
    'stepmother': 'Stepmother',
    'stepfather': 'Stepfather',
    'stepparent': 'Stepparent (non-binary)',
    'stepbrother': 'Stepbrother',
    'stepsister': 'Stepsister',
    'stepsibling': 'Stepsibling (non-binary)',
    
    // Extended family
    'aunt': 'Aunt',
    'uncle': 'Uncle',
    'cousin': 'Cousin',
    'niece': 'Niece',
    'nephew': 'Nephew',
    
    // Other relationships
    'friend': 'Close Friend',
    'spouse': 'Spouse',
    'partner': 'Partner',
    'other': 'Other'
  };
  
  const lowerRelation = relation.toLowerCase();
  return specialCases[lowerRelation] || relation.charAt(0).toUpperCase() + relation.slice(1);
}