import { describe, expect, it } from "vitest";
import { movePriorityNode, priorityDraftError } from "./prioritySettingsModel";
const settings = {enabled:true,group:"Entry",order:[],failureRounds:3,backupSuccessRounds:2,recoverySuccessRounds:3,recoveryStableMs:120000,failbackCooldownMs:60000,probeTimeoutMs:8000,healthyIntervalMs:30000,failureIntervalMs:10000};
describe("priority settings editor", () => {
  it("reorders without mutating source", () => {const original=["a","b","c"];expect(movePriorityNode(original,2,0)).toEqual(["c","a","b"]);expect(original).toEqual(["a","b","c"]);});
  it("ignores invalid drag and keyboard indexes", () => {for(const index of [-1,NaN,4,0.5])expect(movePriorityNode(["a"],index,0)).toEqual(["a"]);});
  it("allows following group order and prevents empty explicit order", () => {expect(priorityDraftError(settings,false,["a"])).toBeNull();expect(priorityDraftError(settings,true,["a"])).not.toBeNull();});
  it("rejects missing nodes and out of range settings", () => {expect(priorityDraftError({...settings,order:["gone"]},true,["a"])).not.toBeNull();expect(priorityDraftError({...settings,failureRounds:0},false,["a"])).not.toBeNull();expect(priorityDraftError({...settings,probeTimeoutMs:NaN},false,["a"])).not.toBeNull();});
  it("can disable monitoring when no profile is selected", () => {expect(priorityDraftError({...settings,enabled:false},false,[])).toBeNull();});
});
