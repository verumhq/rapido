import { AppLoading } from 'expo';
import { Asset } from 'expo-asset';
import React, { Fragment, useState } from 'react';
import { StatusBar } from 'react-native';
// @remove-if-no-components-begin
import { ThemeProvider } from '@rapido/components';
// @remove-if-no-components-end
// @remove-if-no-session-begin
import { SessionProvider, Session } from '@rapido/session';
// @remove-if-no-session-end

// @remove-if-no-components-begin
import theme from './theme';
// @remove-if-no-components-end
import MainView from './views/MainView';

// @remove-if-no-session-begin
const session = new Session();
// @remove-if-no-session-end

const initializeApp = () => {
  const cacheAssets = Asset.loadAsync([require('./assets/icon.png')]);

  // @remove-if-no-session-begin
  const initSession = new Promise<void>((resolve, _) => {
    session.init(() => {
      resolve();
    });
  });
  // @remove-if-no-session-end

  const initialize = new Promise<void>((resolve, _) => {
    Promise.all([
      cacheAssets,
      // @remove-if-no-session-begin
      initSession,
      // @remove-if-no-session-end
    ])
      .then(() => {
        resolve();
      })
      .catch(() => {
        resolve();
      });
  });

  return initialize;
};

function App() {
  const [appInitialized, setAppInitialized] = useState(false);

  if (!appInitialized) {
    return (
      <AppLoading
        startAsync={initializeApp}
        onFinish={() => setAppInitialized(true)}
        onError={console.warn}
      />
    );
  }

  return (
    // @remove-if-no-session-begin
    <SessionProvider session={session}>
      // @remove-if-no-session-end // @remove-if-no-components-begin
      <ThemeProvider theme={theme}>
        // @remove-if-no-components-end
        <Fragment>
          <StatusBar backgroundColor="transparent" barStyle="light-content" />
          <MainView title="Rapido" />
        </Fragment>
        // @remove-if-no-components-begin
      </ThemeProvider>
      // @remove-if-no-components-end // @remove-if-no-session-begin
    </SessionProvider>
    // @remove-if-no-session-end
  );
}

export default App;
