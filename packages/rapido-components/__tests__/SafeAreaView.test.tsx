/**
 * Copyright (c) 2019-present Verum Technologies
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import renderer from 'react-test-renderer';

import SafeAreaView from '../src/SafeAreaView';

const render = (el: any) => renderer.create(el).toJSON();

describe('SafeAreaView', () => {
  test('renders properly', () => {
    const json = render(<SafeAreaView />);
    expect(json).not.toBeNull();
  });
});
