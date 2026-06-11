const GAS_URL = "https://script.google.com/macros/s/AKfycbzHJPVpMJ5J-ZUe-40wFASxy3_1fB7vm2mtfSG1t_1-ijPtEpIKoj9XnPar1ICs5geI/exec";

async function testGas() {
  try {
    console.log("Pinging Google Apps Script endpoint:", GAS_URL);
    const response = await fetch(GAS_URL);
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testGas();
