// react-chartjs-2 bileşenlerini test ortamında boş div olarak render et
import React from 'react'

export const Line = ({ 'data-testid': testId }) =>
  React.createElement('div', { 'data-testid': testId ?? 'line-chart' })

export const Bar = ({ 'data-testid': testId }) =>
  React.createElement('div', { 'data-testid': testId ?? 'bar-chart' })
