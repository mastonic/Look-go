import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeBetaProfileForCloud, validBetaAccessCode } from "../lib/beta-access-policy.ts";

test("personal access code must contain exactly six digits",()=>{
 assert.equal(validBetaAccessCode("000000"),true);
 assert.equal(validBetaAccessCode("123456"),true);
 assert.equal(validBetaAccessCode("12345"),false);
 assert.equal(validBetaAccessCode("1234567"),false);
 assert.equal(validBetaAccessCode("12a456"),false);
 assert.equal(validBetaAccessCode(" 123456"),false);
 assert.equal(validBetaAccessCode("123 56"),false);
});

test("cloud profile sanitizer never persists access-code fields",()=>{
 const source={email:"cliente@example.fr",pseudo:"Cliente",codeConfigured:true,code:"123456",personalCode:"654321",accessCode:"111111",accessCodeValue:"222222",trendBoldness:70};
 const safe=sanitizeBetaProfileForCloud(source);
 assert.equal(safe.email,"cliente@example.fr");
 assert.equal(safe.pseudo,"Cliente");
 assert.equal(safe.trendBoldness,70);
 assert.equal("codeConfigured" in safe,false);
 assert.equal("code" in safe,false);
 assert.equal("personalCode" in safe,false);
 assert.equal("accessCode" in safe,false);
 assert.equal("accessCodeValue" in safe,false);
 assert.equal(source.code,"123456");
});
