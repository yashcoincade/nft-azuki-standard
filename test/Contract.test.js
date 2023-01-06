const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");

describe("Contract", function () {
  //global variables

  beforeEach(async function () {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    fundMe = await ethers.getContract("Contract", deployer);
  });

  describe("function name", async function () {
    it("does what it should", async function () {
      //   const whatResponseShouldBe = "";
      //   const response = await contract.function();
      //   assert.equal(response, whatResponseShouldBe);
    });
  });
});
