/**
 * Copyright (c) 2019-present Max Parelius
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

import Button from './Button';
import { LinkProps } from './types';

// Link - Styled link component
const Link = React.memo<LinkProps>(props => (
  <Button variant="link" {...props} />
));

export default Link;
