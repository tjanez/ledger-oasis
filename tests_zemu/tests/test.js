import { expect, test } from "jest";
import Zemu from "@zondax/zemu";
import OasisApp from "ledger-oasis-js";
const tweetnacl = require("tweetnacl");

const Resolve = require("path").resolve;
const APP_PATH = Resolve("../app/bin/app.elf");

const APP_SEED = "equip will roof matter pink blind book anxiety banner elbow sun young"
const sim_options = {
    logging: true,
    start_delay: 3000,
    custom: `-s "${APP_SEED}"`
//    ,X11: true
};

jest.setTimeout(30000)

function compareSnapshots(snapshotPrefixTmp, snapshotPrefixGolden, snapshotCount) {
    for (let i = 0; i < snapshotCount; i++) {
        const img1 = Zemu.LoadPng2RGB(`${snapshotPrefixTmp}${i}.png`);
        const img2 = Zemu.LoadPng2RGB(`${snapshotPrefixGolden}${i}.png`);
        expect(img1).toEqual(img2);
    }
}

describe('Basic checks', function () {
    it('can start and stop container', async function () {
        const sim = new Zemu(APP_PATH);
        try {
            await sim.start(sim_options);
        } finally {
            await sim.close();
        }
    });

    it('get app version', async function () {
        const sim = new Zemu(APP_PATH);
        try {
            await sim.start(sim_options);
            const app = new OasisApp(sim.getTransport());
            const resp = await app.getVersion();

            console.log(resp);

            expect(resp.return_code).toEqual(0x9000);
            expect(resp.error_message).toEqual("No errors");
            expect(resp).toHaveProperty("test_mode");
            expect(resp).toHaveProperty("major");
            expect(resp).toHaveProperty("minor");
            expect(resp).toHaveProperty("patch");
        } finally {
            await sim.close();
        }
    });

    it('get address', async function () {
        const sim = new Zemu(APP_PATH);
        try {
            await sim.start(sim_options);
            const app = new OasisApp(sim.getTransport());

            const path = [44, 474, 5, 0x80000000, 0x80000003];
            const resp = await app.getAddressAndPubKey(path);

            console.log(resp)

            expect(resp.return_code).toEqual(0x9000);
            expect(resp.error_message).toEqual("No errors");

            // FIXME: Zemu/Speculos is not yet handling Ed25519 derivation
            const expected_bech32_address = "oasis1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzqfyl7w4";
            const expected_pk = "0000000000000000000000000000000000000000000000000000000000000080";

            expect(resp.bech32_address).toEqual(expected_bech32_address);
            expect(resp.pk.toString('hex')).toEqual(expected_pk);

        } finally {
            await sim.close();
        }
    });

    it('show address', async function () {
        const snapshotPrefixGolden = "snapshots/show-address/";
        const snapshotPrefixTmp = "snapshots-tmp/show-address/";
        let snapshotCount = 0;

        const sim = new Zemu(APP_PATH);
        try {
            await sim.start(sim_options);
            const app = new OasisApp(sim.getTransport());

            // Derivation path. First 3 items are automatically hardened!
            const path = [44, 474, 5, 0x80000000, 0x80000003];
            const respRequest = app.showAddressAndPubKey(path);

            // We need to wait until the app responds to the APDU
            await Zemu.sleep(2000);

            // Now navigate the address / path
            await sim.snapshot(`${snapshotPrefixTmp}${snapshotCount++}.png`);
            await sim.clickRight(`${snapshotPrefixTmp}${snapshotCount++}.png`);
            await sim.clickRight(`${snapshotPrefixTmp}${snapshotCount++}.png`);
            await sim.clickRight(`${snapshotPrefixTmp}${snapshotCount++}.png`);
            await sim.clickRight(`${snapshotPrefixTmp}${snapshotCount++}.png`);
            await sim.clickRight(`${snapshotPrefixTmp}${snapshotCount++}.png`);
            await sim.clickRight(`${snapshotPrefixTmp}${snapshotCount++}.png`);
            await sim.clickBoth(`${snapshotPrefixTmp}${snapshotCount++}.png`);

            const resp = await respRequest;
            console.log(resp);

            compareSnapshots(snapshotPrefixTmp, snapshotPrefixGolden, snapshotCount);

            expect(resp.return_code).toEqual(0x9000);
            expect(resp.error_message).toEqual("No errors");

            // FIXME: Zemu/Speculos is not yet handling Ed25519 derivation
            const expected_bech32_address = "oasis1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzqfyl7w4";
            const expected_pk = "0000000000000000000000000000000000000000000000000000000000000080";

            expect(resp.bech32_address).toEqual(expected_bech32_address);
            expect(resp.pk.toString('hex')).toEqual(expected_pk);
        } finally {
            await sim.close();
        }
    });

    it('sign basic', async function () {
        const snapshotPrefixGolden = "snapshots/sign-basic/";
        const snapshotPrefixTmp = "snapshots-tmp/sign-basic/";
        let snapshotCount = 0;

        const sim = new Zemu(APP_PATH);
        try {
            await sim.start(sim_options);
            const app = new OasisApp(sim.getTransport());

            const path = [44, 474, 5, 0x80000000, 0x80000003];
            const context = "oasis-core/consensus: tx for chain testing";
            const txBlob = Buffer.from(
                "pGNmZWWiY2dhcwBmYW1vdW50QGRib2R5omd4ZmVyX3RvWCBkNhaFWEyIEubmS3EVtRLTanD3U+vDV5fke4Obyq83CWt4ZmVyX3Rva2Vuc0Blbm9uY2UAZm1ldGhvZHBzdGFraW5nLlRyYW5zZmVy",
                "base64",
            );

            const pkResponse = await app.getAddressAndPubKey(path);
            console.log(pkResponse);
            expect(pkResponse.return_code).toEqual(0x9000);
            expect(pkResponse.error_message).toEqual("No errors");

            // do not wait here..
            const signatureRequest = app.sign(path, context, txBlob);

            await Zemu.sleep(2000);

            // Reference window
            await sim.snapshot(`${snapshotPrefixTmp}${snapshotCount++}.png`);
            for (let i = 0; i < 8; i++) {
                await sim.clickRight(Resolve(`${snapshotPrefixTmp}${snapshotCount++}.png`));
            }
            await sim.clickBoth();

            let resp = await signatureRequest;
            console.log(resp);

            compareSnapshots(snapshotPrefixTmp, snapshotPrefixGolden, snapshotCount);

            expect(resp.return_code).toEqual(0x9000);
            expect(resp.error_message).toEqual("No errors");

            // Now verify the signature
            // FIXME: We cannot verify Zemu/Speculos signatures are Ed25519 is not yet supported in emulation
            // Related to https://github.com/LedgerHQ/speculos/pull/56

        } finally {
            await sim.close();
        }
    });

    it('ed25519', async function () {

        // Now verify the signature
        let message = Buffer.from("aaa731e500eab8062b5f95830900872a4a4a85560fdf56cecfa0242036299ac7", "hex");
        let sk = Buffer.from("00000000000000000000000000000000000000000000000000000000000000003b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29", "hex");

        let pair = tweetnacl.sign.keyPair.fromSecretKey( Uint8Array.from(sk) );
//        console.log(pair)

        console.log(Buffer.from(pair.publicKey).toString("hex"))
        console.log(Buffer.from(pair.secretKey).toString("hex"))

        let sig = tweetnacl.sign(Uint8Array.from(message), Uint8Array.from(sk))
        console.log(Buffer.from( sig).toString("hex"))

//        const valid = ed25519.verify(signatureResponse.signature.slice(1), prehash, pubKey);
    });
});