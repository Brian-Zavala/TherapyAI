/**
 * Profile Update Test Script
 * 
 * This script can be used to test the profile update functionality
 * Run with: node src/tests/profile-update-test.js
 */

const testProfileUpdate = async () => {
  const testData = {
    name: "John Doe Updated",
    pronouns: "he/him",
    age: "35",
    phone: "+1-555-123-4567",
    partnerName: "Jane Doe",
    partnerAge: "33",
    relationshipStatus: "Married",
    familyMember1: "Alice Doe",
    familyMember1Age: "8",
    familyMember1Relation: "Daughter",
    familyMember2: "Bob Doe",
    familyMember2Age: "10",
    familyMember2Relation: "Son",
    currentConcerns: ["Communication", "Time Management"],
    emergencyContact: "Emergency Contact - 555-999-9999",
    sessionPreference: "60",
    preferredDays: ["Monday", "Wednesday", "Friday"],
    sessionFrequency: "weekly",
    communicationStyle: "direct",
    additionalNotes: "Updated notes for testing",
    notificationPrefs: "both"
  };

  console.log('Profile Update Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  
  console.log('\nExpected processing:');
  console.log('- Age should be converted to number:', parseInt(testData.age));
  console.log('- Partner age should be converted to number:', parseInt(testData.partnerAge));
  console.log('- Family member ages should be converted to numbers');
  console.log('- Notification prefs "both" should become ["email", "sms"]');
  console.log('- Current concerns should remain as array');
  console.log('- Preferred days should remain as array');
  
  return testData;
};

// Run the test
if (require.main === module) {
  testProfileUpdate().then(() => {
    console.log('\nTest data prepared. Use this structure when testing the API.');
  });
}

module.exports = { testProfileUpdate };