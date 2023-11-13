import { strict as assert } from 'assert';
import signify from 'signify-ts';

const url = 'http://127.0.0.1:3901';
const boot_url = 'http://127.0.0.1:3903';
const WAN_WITNESS_AID = 'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha';
const WIL_WITNESS_AID = 'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM';
const WES_WITNESS_AID = 'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX';
const KLI_WITNESS_DEMO_PREFIXES = [
    WAN_WITNESS_AID,
    WIL_WITNESS_AID,
    WES_WITNESS_AID,
];

// Boots an agent and connects to it, returning the connected SignifyClient
async function bootAndConnect(
  bran: string = signify.randomPasscode(),
  agentUrl: string = url,
  bootUrl: string = boot_url,
  tier: signify.Tier = signify.Tier.low
) {
    const client = new signify.SignifyClient(agentUrl, bran, tier, bootUrl);
    await client.boot();
    await client.connect();
    return client;
}

// utility function for making a correctly formatted timestamp
function createTimestamp() {
    return new Date().toISOString().replace('Z', '000+00:00');
}

// typed interface for Notification
interface Notification {
    i: string;
    dt: string;
    r: boolean;
    a: { r: string; d?: string; m?: string };
}

// checks for notifications on a route and returns them as an array
async function waitForNotifications(
  client: signify.SignifyClient,
  route: string
): Promise<Notification[]> {
    const awaitedNotifications = [];
    while (true) {
        let notifications = await client.notifications().list();
        for (let note of notifications.notes) {
            if (note.a.r === route) {
                awaitedNotifications.push(note);
            }
        }
        if (awaitedNotifications.length > 0) break;

        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return awaitedNotifications;
}

await run();

// main test function
async function run() {
    await signify.ready();
    // Boot three clients one each for issuer, holder, and verifier
    const issuerClient = await bootAndConnect(signify.randomPasscode());
    const holderClient = await bootAndConnect(signify.randomPasscode());
    const verifierClient = await bootAndConnect(signify.randomPasscode());

    const state1 = await issuerClient.state();
    const state2 = await holderClient.state();
    const state3 = await verifierClient.state();
    console.log(
      'Issuer connected.\n\tHolder Controller AID:',
      state1.controller.state.i,
      '\n\tIssuer Agent AID: ',
      state1.agent.i
    );
    console.log(
      'Holder connected.\n\tHolder Controller AID:',
      state2.controller.state.i,
      '\n\tHolder Agent AID: ',
      state2.agent.i
    );
    console.log(
      'Verifier connected.\n\tVerifier Controller AID:',
      state3.controller.state.i,
      '\n\tVerifier Agent AID: ',
      state3.agent.i
    );

    const issuerAidName = 'issuer';
    const holderAidName = 'holder';
    const verifierAidName = 'verifier';

    // Create two identifiers, one for each client
    let issuerIcpRes = await issuerClient.identifiers().create(issuerAidName, {
        toad: 3,
        wits: [...KLI_WITNESS_DEMO_PREFIXES],
    });
    let issOp = await issuerIcpRes.op();
    while (!issOp['done']) {
        issOp = await issuerClient.operations().get(issOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const issAidResp = await issuerClient.identifiers().get(issuerAidName);
    const issuerAID = issAidResp.prefix
    await issuerClient
        .identifiers()
        .addEndRole(issuerAidName, 'agent', issuerClient!.agent!.pre);
    console.log("Issuer's AID:", issuerAID);

    let holderIcpRes = await holderClient.identifiers().create(holderAidName, {
        toad: 3,
        wits: [...KLI_WITNESS_DEMO_PREFIXES],
    });
    let hldOp = await holderIcpRes.op();
    while (!hldOp['done']) {
        hldOp = await holderClient.operations().get(hldOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const hldAidResp = await holderClient.identifiers().get(holderAidName);
    const holderAID = hldAidResp.prefix
    await holderClient
        .identifiers()
        .addEndRole(holderAidName, 'agent', holderClient!.agent!.pre);
    console.log("Recipient's AID:", holderAID);

    let verifierIcpRes = await verifierClient.identifiers().create(verifierAidName, {
        toad: 3,
        wits: [...KLI_WITNESS_DEMO_PREFIXES],
    });
    let vfyOp = await verifierIcpRes.op();
    while (!vfyOp['done']) {
        vfyOp = await verifierClient.operations().get(vfyOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const vfyAidResp = await verifierClient.identifiers().get(verifierAidName);
    const verifierAID = vfyAidResp.prefix
    await verifierClient
        .identifiers()
        .addEndRole(verifierAidName, 'agent', verifierClient!.agent!.pre);
    console.log("Verifier's AID:", verifierAID);

    const schemaSAID = 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao';

    // OOBIs for credential schema and agent discovery
    console.log('Resolving Schema and Agent OOBIs...');

    // Credential Schema discovery through credential schema OOBI resolution
    const qviSchemaSAID = 'EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao';
    const vLEIServerHostUrl = 'http://127.0.0.1:7723/oobi';
    let schemaOobiUrl = `${vLEIServerHostUrl}/${qviSchemaSAID}`;

    console.log(`Resolving schema OOBIs with ${schemaOobiUrl}`);
    issOp = await issuerClient.oobis().resolve(schemaOobiUrl, 'schema');
    while (!issOp['done']) {
        issOp = await issuerClient.operations().get(issOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    hldOp = await holderClient.oobis().resolve(schemaOobiUrl, 'schema');
    while (!hldOp['done']) {
        hldOp = await holderClient.operations().get(hldOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    vfyOp = await verifierClient.oobis().resolve(schemaOobiUrl, 'schema');
    while (!vfyOp['done']) {
        vfyOp = await verifierClient.operations().get(vfyOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    let issSchema = await issuerClient.schemas().get(schemaSAID);
    assert.equal(issSchema.$id, schemaSAID);
    let hldSchemas = await holderClient.schemas().list();
    assert.equal(hldSchemas.length, 1);
    assert.equal(hldSchemas[0].$id, schemaSAID);
    console.log('Resolved QVI Schema OOBI for issuer, holder, and verifier');

    // Agent discovery through OOBI exchange between issuer, holder, and verifier
    console.log('Getting Agent OOBIs for issuer, holder, and verifier');
    let issAgentOOBI = await issuerClient.oobis().get(issuerAidName, 'agent');
    let hldAgentOOBI = await holderClient.oobis().get(holderAidName, 'agent');
    let vfyAgentOOBI = await verifierClient.oobis().get(verifierAidName, 'agent');

    // issuer -> holder, verifier
    issOp = await issuerClient.oobis().resolve(hldAgentOOBI.oobis[0], holderAidName);
    while (!issOp['done']) {
        issOp = await issuerClient.operations().get(issOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    issOp = await issuerClient.oobis().resolve(vfyAgentOOBI.oobis[0], verifierAidName);
    while (!issOp['done']) {
        issOp = await issuerClient.operations().get(issOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    console.log('Issuer resolved 2 OOBIs: [holder, verifier]');

    // holder -> issuer, verifier
    hldOp = await holderClient.oobis().resolve(issAgentOOBI.oobis[0], issuerAidName);
    while (!hldOp['done']) {
        hldOp = await holderClient.operations().get(hldOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    hldOp = await holderClient.oobis().resolve(vfyAgentOOBI.oobis[0], verifierAidName);
    while (!hldOp['done']) {
        hldOp = await holderClient.operations().get(hldOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    console.log('Holder resolved 2 OOBIs: [issuer, verifier]');

    // verifier -> issuer, holder
    vfyOp = await verifierClient.oobis().resolve(issAgentOOBI.oobis[0], issuerAidName);
    while (!vfyOp['done']) {
        vfyOp = await verifierClient.operations().get(vfyOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    vfyOp = await verifierClient.oobis().resolve(hldAgentOOBI.oobis[0], holderAidName);
    while (!vfyOp['done']) {
        vfyOp = await verifierClient.operations().get(vfyOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    console.log('Verifier resolved 2 OOBIs: [issuer, holder]');

    // Create registry for issuer
    const registryName = 'vLEI-test-registry';
    const regResult = await issuerClient
        .registries()
        .create({ name: issuerAidName, registryName: registryName });
    issOp = await regResult.op();
    while (!issOp['done']) {
        issOp = await issuerClient.operations().get(issOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    let registries = await issuerClient.registries().list(issuerAidName);
    const registry = registries[0];
    assert.equal(registries.length, 1);
    assert.equal(registry.name, registryName);
    console.log(`Registry created: ${registry.name}`);

    //
    // IPEX
    //

    // Issue credential from the issuer's perspective - create credential,
    // then perform IPEX grant as EXN message
    const vcdata = {
        LEI: '5493001KJTIIGC8Y1R17',
    };
    const issResult = await issuerClient
        .credentials()
        .issue(issuerAidName, registry.regk, schemaSAID, holderAID, vcdata);
    issOp = await issResult.op();
    while (!issOp['done']) {
        issOp = await issuerClient.operations().get(issOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    let issCreds = await issuerClient.credentials().list();
    assert.equal(issCreds.length, 1);
    assert.equal(issCreds[0].sad.s, schemaSAID);
    assert.equal(issCreds[0].sad.i, issuerAID);
    assert.equal(issCreds[0].status.s, '0'); // 0 = issued
    console.log(`Issuer: credential created with data: ${JSON.stringify(vcdata)}`);

    // prepare IPEX GRANT message
    const acdc = new signify.Serder(issResult.acdc);
    const iss = issResult.iserder;
    const ianc = issResult.anc;

    const sigers = issResult.sigs.map(
      (sig: string) => new signify.Siger({ qb64: sig })
    );
    const ims = signify.d(signify.messagize(ianc, sigers));

    const atc = ims.substring(ianc.size); // attachment
    let dt = createTimestamp(); // grant datetime

    const [grant, gsigs, gend] = await issuerClient
        .ipex()
        .grant(
            issuerAidName,
            holderAID,
            '',
            acdc,
            issResult.acdcSaider,
            iss,
            issResult.issExnSaider,
            issResult.anc,
            atc,
            undefined,
            dt
        );
    await issuerClient
        .exchanges()
        .sendFromEvents(issuerAidName, 'credential', grant, gsigs, gend, [
            holderAID,
        ]);
    console.log('Issuer: IPEX GRANT sent to holder');

    // from the holder's perspective - wait for GRANT notification,
    // perform admit, then mark GRANT notification as read
    const holderNotifications = await waitForNotifications(
      holderClient,
      '/exn/ipex/grant'
    );
    const grantNotification = holderNotifications[0]; // should only have one notification right now

    // Note: Credentials are no longer automatically accepted into a wallet.
    //       Pending an implementation in KERIA there will be the ability to
    //       auto-add credentials by automatically admitting credentials.
    const [admit, sigs, aend] = await holderClient.ipex()
      .admit(
        holderAidName,
        '',
        grantNotification.a.d!,
        createTimestamp());
    await holderClient.ipex()
      .submitAdmit(holderAidName, admit, sigs, aend, [issuerAID]);
    console.log('Holder: IPEX ADMIT sent');

    await holderClient.notifications().mark(grantNotification.i);
    console.log('Holder: IPEX GRANT notification marked');

    // list credentials to show new credential received through IPEX GRANT+ADMIT
    let holderCreds = await holderClient.credentials().list();
    while (holderCreds.length < 1) {
        console.log('Holder: No credentials yet...');
        await new Promise((resolve) => setTimeout(resolve, 250));
        holderCreds = await holderClient.credentials().list();
    }
    const hldVleiAcdc: any = holderCreds[0];
    assert.equal(holderCreds.length, 1)
    assert.equal(hldVleiAcdc.sad.s, schemaSAID)
    assert.equal(hldVleiAcdc.sad.i, issuerAID)
    assert.equal(hldVleiAcdc.status.s, "0") // 0 = issued
    console.log('Credential received by recipient');

    // Present credential
    const [grant2, gsigs2, gend2] = await holderClient
        .ipex()
        .grant(
            holderAidName,
            verifierAID,
            '',
            acdc,
            issResult.acdcSaider,
            iss,
            issResult.issExnSaider,
            issResult.anc,
            atc,
            undefined,
            createTimestamp()
        );
    await holderClient
        .exchanges()
        .sendFromEvents(holderAidName, 'presentation', grant2, gsigs2, gend2, [
            verifierAID,
        ]);
    console.log('Holder: Grant message sent for presentation');

    // Verifier check issued credential
    const verifierNotifications = await waitForNotifications(
      verifierClient,
      '/exn/ipex/grant'
    );
    let verifierGrantNote = verifierNotifications[0];

    const [admit3, sigs3, aend3] = await verifierClient.ipex()
      .admit(verifierAidName, '', verifierGrantNote.a.d!, createTimestamp());
    await verifierClient.ipex()
      .submitAdmit(verifierAidName, admit3, sigs3, aend3, [holderAID]);
    console.log('Verifier: Admit sent for presentation');

    await verifierClient.notifications().mark(verifierGrantNote.i);
    console.log('Verifier: Notification marked for presentation');

    // list credentials for verifier
    let verifierCreds = await verifierClient.credentials().list();
    while (verifierCreds.length < 1) {
        console.log('No credentials yet...');
        await new Promise((resolve) => setTimeout(resolve, 250));
        verifierCreds = await verifierClient.credentials().list();
    }
    assert.equal(verifierCreds.length, 1)
    assert.equal(verifierCreds[0].sad.s, schemaSAID)
    assert.equal(verifierCreds[0].sad.i, issuerAID)
    assert.equal(verifierCreds[0].status.s, "0") // 0 = issued
    console.log('Credential presented and received by verifier');

    // Revoke credential
    issOp = await issuerClient.credentials().revoke(issuerAidName, issCreds[0].sad.d);
    while (!issOp['done']) {
        issOp = await issuerClient.operations().get(issOp.name);
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    issCreds = await issuerClient.credentials().list();
    const issVleiAcdc = issCreds[0]
    assert.equal(issCreds.length, 1);
    assert.equal(issVleiAcdc.sad.s, schemaSAID);
    assert.equal(issVleiAcdc.sad.i, issuerAID);
    assert.equal(issVleiAcdc.status.s, '1'); // 1 = revoked
    console.log('Issuer Credential revoked');

    // Recipient check revoked credential
    // let revoked = false
    // while (!revoked) {
    //     let cred2 = await client2.credentials().get(holderAidName, creds1[0].sad.d)
    //     if (cred2.status.s == "1") {
    //         revoked = true
    //     }
    //     await new Promise((resolve) => setTimeout(resolve, 250));
    // }
    // assert.equal(creds2.length, 1)
    // assert.equal(creds2[0].sad.s, schemaSAID)
    // assert.equal(creds2[0].sad.i, aid1.prefix)
    // assert.equal(creds2[0].status.s, "1") // 1 = revoked
    // console.log("Revocation received by recipient")

    // Present revoked credential
    // await client1
    //     .credentials()
    //     .present(issuerAidName, creds1[0].sad.d, verifierAidName, true);
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // creds3 = await client3.credentials().list(verifierAidName);
    // assert.equal(creds3.length, 1);
    // assert.equal(creds3[0].sad.s, schemaSAID);
    // assert.equal(creds3[0].sad.i, aid1.prefix);
    // assert.equal(creds3[0].status.s, '1'); // 1 = revoked
    // console.log('Revocation presented and received by verifier');
}
