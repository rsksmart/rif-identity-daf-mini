/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import './shim'

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Button,
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { Entities } from 'daf-core'
import Debug from 'debug'

import { agent, dbConnection } from './setup'

const debug = Debug('rif-id:App')

const App: () => React$Node = () => {
  const [identity, setIdentity] = useState('')
  const [error, setError] = useState('')

  const [requestJwt, setRequestJwt] = useState('')
  const [requestHash, setRequestHash] = useState('')
  // const [credentialJWT, setCredentialJWT] = useState('')
  // const [credential, setCredential] = useState(null)
  // const [credentialReceiveError, setCredentialReceiveError] = useState('')

  const setDefaultIdentity = async () => {
    try {
      const identities = await agent.identityManager.getIdentities()

      debug('Identities', identities)

      if (identities.length > 0) {
        debug('Identity exists')
        setIdentity(identities[0].did)
      } else {
        debug('Creating identity')
        const identity = await agent.identityManager.createIdentity()
        setIdentity(identity.did)
      }

      debug(identity)
    } catch (e) {
      setError(Date.now().toString() + ' - ' + e.message)
    }
  }

  const printTables = async () => {
    for (_ent of Entities) {
      await (await dbConnection).getRepository(_ent).find().then(debug)
    }
  }

  const deleteIdentities = async () => {
    for (_ent of Entities) {
      await (await dbConnection).getRepository(_ent).clear().then(() => debug('Success'))
    }
  }

  /** request operations */
  const requestCredential = async () => {
    const sdrData = {
      issuer: identity,
      claims: [
        {
          claimType: 'credentialRequest',
          claimValue: 'cred1'
        },
        {
          claimType: 'name',
          claimValue: 'Alan Turing',
          essential: true,
        },
        {
          claimType: 'age',
          claimValue: 35
        },
        {
          claimType: 'status',
          claimValue: 'coding...'
        },
      ],
      credentials: [],
    }

    const sdrJwt = await agent.handleAction({
      type: 'sign.sdr.jwt',
      data: sdrData,
    })

    const didCommData = {
      from: identity,
      to: 'did:ethr:rsk:testnet:0x37309bf0fcda162ad7d2c154b305b996621767b9',
      type: 'jwt',
      body: sdrJwt,
    }

    const message = await agent.handleAction({
      type: 'send.message.didcomm-alpha-1',
      data: didCommData,
      url: 'http://localhost:5100/requestCredential', // need to setup did doc to avoid url
      save: false
    })

    setRequestJwt(message.raw)

    const hash = keccak256(sdrJwt).toString('hex')
    console.log(hash)
    setRequestHash(hash)
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          {global.HermesInternal == null ? null : (
            <View style={styles.engine}>
              <Text style={styles.footer}>Engine: Hermes</Text>
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Identity</Text>
              <Button onPress={setDefaultIdentity} title="Create" />
              <Text style={styles.sectionDescription}>
                {identity}
              </Text>
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Request</Text>
              <Button onPress={requestCredential} title="Request" />
              <Text style={styles.sectionDescription}>
                jwt: {requestJwt}
              </Text>
            </View>
            <View style={styles.sectionContainer}>
              <Button onPress={deleteIdentities} title="Delete all DB" />
              <Button onPress={printTables} title="Log all DB" />
              <Text style={styles.sectionTitle}>Error</Text>
              <Text style={styles.sectionDescription}>
                {error}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;
