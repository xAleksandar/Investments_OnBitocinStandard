module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    es6: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-console': 'off', // Allow console for logging
    'no-debugger': 'error',
    'no-alert': 'warn',
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',

    // Code quality
    'prefer-const': 'warn',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['warn', '1tbs'],
    'comma-dangle': ['warn', 'never'],
    'quotes': ['warn', 'single', { allowTemplateLiterals: true }],
    'semi': ['warn', 'always'],

    // ES6+ features
    'arrow-spacing': 'warn',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
    'template-curly-spacing': ['warn', 'never'],

    // Async/await
    'require-await': 'warn',
    'no-return-await': 'warn',

    // Best practices
    'dot-notation': 'warn',
    'no-else-return': 'warn',
    'no-multi-spaces': 'warn',
    'no-trailing-spaces': 'warn',
    'space-before-blocks': 'warn',
    'keyword-spacing': 'warn',
    'space-infix-ops': 'warn',
    'comma-spacing': 'warn',
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never'],

    // Function parameters
    'max-params': ['warn', 5],
    'no-param-reassign': 'warn'
  },
  globals: {
    // Browser globals
    window: 'readonly',
    document: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    setInterval: 'readonly',
    clearTimeout: 'readonly',
    clearInterval: 'readonly',
    fetch: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    FormData: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',

    // Chart.js (if used)
    Chart: 'readonly',

    // Application globals
    BitcoinApp: 'readonly',
    game: 'readonly' // Legacy global
  },
  overrides: [
    {
      // Server-side files
      files: ['server.js', 'src/server/**/*.js', 'scripts/**/*.js'],
      env: {
        node: true,
        browser: false
      },
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    {
      // Client-side files
      files: ['src/client/**/*.js', 'public/**/*.js'],
      env: {
        browser: true,
        node: false
      },
      parserOptions: {
        sourceType: 'module'
      }
    },
    {
      // Test files
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        node: true,
        browser: true
      },
      globals: {
        test: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    }
  ]
};