/**
 * Copyright (c) 2019-present Verum Technologies
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import Image from '@theme/IdealImage';

import users from '../../data/users';
import styles from './styles.module.css';

const ITEMS_PER_ROW = 3; // Sync up the item col width if this is changed.
const TITLE = 'Showcase';
const DESCRIPTION = 'See the awesome projects people are building with Rapido';

function chunkArray(array, size) {
  const chunks = [];
  const copied = [...array];
  const numChunks = Math.ceil(copied.length / size); // Round up to the nearest integer.
  for (let i = 0; i < numChunks; i++) {
    chunks.push(copied.splice(0, size));
  }

  return chunks;
}

function Showcase() {
  return (
    <Layout title={TITLE} description={DESCRIPTION}>
      <div className="container margin-vert--xl">
        <div className="text--center margin-bottom--xl">
          <h1>{TITLE}</h1>
          <p>{DESCRIPTION}</p>
        </div>
        {chunkArray(users, ITEMS_PER_ROW).map((row, i) => (
          <div key={`row${i}`} className="row margin-vert--lg">
            {row.map(user => (
              <div key={user.title} className="col col--4">
                <div className={classnames('card', styles.showcaseUser)}>
                  <div className="card__image">
                    <Image img={user.preview} alt={user.title} />
                  </div>
                  <div className="card__body">
                    <div className="avatar">
                      <div className="avatar__intro margin-left--none">
                        <h4 className="avatar__name">{user.title}</h4>
                        <small className="avatar__subtitle">
                          {user.description}
                        </small>
                      </div>
                    </div>
                  </div>
                  {(user.website || user.source) && (
                    <div className="card__footer">
                      <div className="button-group button-group--block">
                        {user.website && (
                          <a
                            className="button button--small button--secondary button--block"
                            href={user.website}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Website
                          </a>
                        )}
                        {user.source && (
                          <a
                            className="button button--small button--secondary button--block"
                            href={user.source}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default Showcase;
