module.exports = {
  plugins: ['stylelint-order'],
  rules: {
    'order/order': ['dollar-variables', 'custom-properties', 'declarations'],
    'order/properties-order': [
      [
        'content',
        'display',
        'position',
        'align-items',
        'justify-content',
        {
          emptyLineBefore: 'never',
          noEmptyLineBetween: true,
          properties: [
            'width',
            'height',
            'margin',
            'margin-top',
            'margin-right',
            'margin-bottom',
            'margin-left',
            'padding',
            'padding-top',
            'padding-right',
            'padding-bottom',
            'padding-left'
          ]
        },
        {
          emptyLineBefore: 'never',
          noEmptyLineBetween: true,
          properties: ['top', 'right', 'bottom', 'left']
        },
        {
          emptyLineBefore: 'never',
          noEmptyLineBetween: true,
          properties: [
            'border',
            'border-top',
            'border-right',
            'border-bottom',
            'border-left',
            'border-top-color',
            'border-right-color',
            'border-bottom-color',
            'border-left-color',
            'border-top-width',
            'border-right-width',
            'border-bottom-width',
            'border-left-width'
          ]
        },
        {
          emptyLineBefore: 'never',
          noEmptyLineBetween: true,
          properties: ['overflow', 'white-space', 'text-overflow']
        },
        {
          emptyLineBefore: 'always',
          noEmptyLineBetween: true,
          properties: ['color', 'text-align', 'line-height', 'font-size', 'font-weight', 'font-family', 'font-style']
        }
      ],
      { unspecified: 'bottom' }
    ]
  }
}
