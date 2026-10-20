import { escapeLike } from './utils';

describe('escapeLike', () => {

  it.each([
    { input: 'luffy',  expected: 'luffy'    },
    { input: '100%',   expected: '100\\%'   },
    { input: 'a_b',    expected: 'a\\_b'    },
    { input: 'a\\b',   expected: 'a\\\\b'   },
    { input: '%_\\',   expected: '\\%\\_\\\\' },
    { input: '',       expected: ''         },
  ])('escapeLike($input) devuelve $expected', ({ input, expected }) => {
    expect(escapeLike(input)).toBe(expected);

  });

});
