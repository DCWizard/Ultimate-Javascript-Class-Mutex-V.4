var TheCopyRightNotice          = `Copyright © 2020-2022 Denis Cote ThinknSpeak`;

class Mutex {
  constructor() {
    // PRIVATE :
    var _Lock                   = Promise.resolve("Ready");
    var LockStack               = [_Lock];
    var ReleaseStack            = [_Lock];
    
    var _DEBUGTRACE             = true;
    NameThisObject              = function (ThisObject, ThisName){
      Object.defineProperty(ThisObject, 'name', {
        value: ThisName,
        configurable: true,
      });
    }
    NameThisObject (_Lock, "Init_NextLock");
    _Lock["State"]              = "fulfilled"; 

    var _acquire                = function (ThisName) {
      var ThisNextRelease;
      const ThisLock = _Lock   = new Promise(resolve => {
          ThisNextRelease = resolve;
      });
      NameThisObject (ThisLock, ThisName + "_NextLock");
      ThisLock["State"]        = "pending";
      LockStack.push              (ThisLock);
      function GetThatFulfilledState (ThatLock){
        ThatLock.then(()=>{
          ThatLock["State"]    = "fulfilled";
        });
      }
      GetThatFulfilledState       (ThisLock);
      NameThisObject (ThisNextRelease, ThisName + "_NextRelease");
      ThisNextRelease["State"]  = "pending";
      // IN ORDER TO HAVE IT LAST ON THE STACK 
      // YOU MUST PUSH IT AT DISTRIBUTION IN THE _Lock.then(() => 
      // OR PLACE IT IN A SEPARATED STACK SINCE IT'S THE MOST IMPORTANT ONE
      LockStack.push              (ThisNextRelease);
      ReleaseStack.push           (ThisNextRelease);
      return ThisNextRelease;
    }

    // PUBLIC :
    this.IsLocked               = function (){
      // UNFORTUNATELLY WE DON'T HAVE ACCESS TO Promise::<state> NOT EVEN IN READONLY PROVIDED BY AND THANKS TO MOLTON BORONS. 
      // BUT THE DEBUGGER CAN: SIMPLIFYING BY MAKING IT WORST 
      // SO, WE HAVE TO DO THIS STUPID CONTRACTION INSTEAD;
      // LOOK ABOVE IN THE _acquire FUNCTION  FOR GetThatFulfilledState HAS IT RECORDS THE FULFULL STATE 
      // UNFORTUNATELLY IT RECEIVED THE EVENT TOO LATE (NOT ACCURATE ENOUGH)
      // IF YOU PREFER TO GET THE STATUS AFTER ALL HAVE EXECUTED INSTEAD 
      // THAT'S YOUR GUY
      // if(_Lock["State"]        == "pending"){
      //   return true;
      // }
      // return false;

      // Promise.any(LockStack).then((value) => console.log("ANY OF: ", value)); 
      // AGAIN! IN A FUCKIN' THEN() CAN'T THEY JUST CHECK AND RETURN THE RESULT RIGHT AWAY.
      // IT SHOULDN'T BE THAT HARD TO LOOK AT A STACK. LOOK AT MINE BELOW
      // THIS IS AS STUPID AS THE MORONS WHO WROTE THIS. +AS IT'S RETURNING THE FIRST ONE. 
      // SO, I'M GONNA DO IT RIGHT...

      // ONE WAY WE CAN DO IS CHECK THE LAST STATUS ON THE (OUR) STACK... 
      // NOT MY CHOICE I WOULD HAVE PREFERRED THAT THEY WOULD HAVE DONE A GOOD JOB.
      let ThisLastLock          = ReleaseStack[ReleaseStack.length - 1];
      if(ThisLastLock["State"] == "pending"){
        return true;
      }
      return false;
    }
    this.IsStillLocked          = function (){
      // IF YOU PREFER TO GET THE STATUS AFTER ALL HAVE EXECUTED INSTEAD 
      // THAT'S YOUR GUY
      if(_Lock["State"]        == "pending"){
        return true;
      }
      return false;
    }
    this.GetCurrentStack        = function (){
      let ThisCopy              = CloneObject(LockStack);
      return ThisCopy;
    }
    this.ReportStatus           = function (){
      for(let Each             in LockStack){
        let ThatLock            = LockStack[Each];
        console.log(ThatLock.name + "\tStatus:", ThatLock, ThatLock.State);
      }
      console.warn("IsLocked\t:", this.IsLocked());
      console.warn("IsStillLocked\t:", this.IsStillLocked());
    }
    this.AcquireNextLock        = function (ThisName) {
      const  ThisNextThen       = _Lock.then(() => 
      // ThisNextRelease
      // OR... THE SAME AS...
      {
        ThisNextThen["State"]   = "fulfilled";
        // WE CAN PUSH IT NOW TO HAVE IT LAST IN THE STACK 
        // LockStack.push              (ThisNextRelease);
        return ThisNextRelease;    // RETURN THE .then() RESULT PROMISE  = AcquireNextLock(ThisName).then( (parm) => This release)
        // This release =  await this.AcquireNextLock(ThisName); 
      });
      const  ThisNextRelease    = _acquire.call(this, ThisName);
      NameThisObject              (ThisNextThen, ThisName + "_NextThen");
      ThisNextThen["State"]     = "pending";
      LockStack.push              (ThisNextThen);
      return ThisNextThen;  // RETURN THE .then PROMISE (WITHOUT await) =  TheNextPromise = this.AcquireNextLock(ThisName); TheNextPromise.then(...)
    }
    this.AwaitExecute           = async function (ThisName, ThisCallBack) {
      if(_DEBUGTRACE){console.log(ThisName + " Requesting lock");}
      let ThisRet = null;

      let ThisUnlockFnc         = await this.AcquireNextLock(ThisName); 

      if(_DEBUGTRACE){
        console.log(ThisName, ThisUnlockFnc, "acquired lock");
        this.ReportStatus();
      }
      
      if(typeof ThisCallBack  === 'function'){
        if(_DEBUGTRACE){console.log(ThisName, "Executing with", ThisUnlockFnc, "On this", ThisCallBack);}
        ThisRet                 = await ThisCallBack.call(this, ThisName, ThisUnlockFnc);
      }
      ThisUnlockFnc.State       = "fulfilled";
      ThisUnlockFnc(ThisRet); 
      if(_DEBUGTRACE){console.log(ThisName + " Released lock with ", ThisRet, "IsLocked:", this.IsLocked());}
    }
    this.Execute                = async function (ThisName, ThisCallBack) {
      if(_DEBUGTRACE){console.log(ThisName + " Requesting lock");}
      let ThisRet = null;

      let ThisNextLock          = this.AcquireNextLock(ThisName);
      ThisNextLock.then(async ThisUnlockFnc => {
        if(_DEBUGTRACE){
          console.log(ThisName, ThisUnlockFnc, "acquired lock");
          this.ReportStatus();
        }
        
        if(typeof ThisCallBack  === 'function'){
          if(_DEBUGTRACE){console.log(ThisName, "Executing with", ThisUnlockFnc, "On this", ThisCallBack);}
          ThisRet                 = await ThisCallBack.call(this, ThisName, ThisUnlockFnc);
        }
        ThisUnlockFnc.State       = "fulfilled";
        // NOTICE: NOT THE LAST LOCK: IsLocked() STILL ["State"] = "pending"
        ThisUnlockFnc(ThisRet); 
        if(_DEBUGTRACE){console.warn(ThisName + " Released lock with ", ThisRet, "IsLocked:", this.IsLocked());}
      }); 
    }
    // IF YOU DO YOUR OWN Execute OR AwaitExecute 
    // IT IS YOUR RESPONSIBILITY TO SET THE ThisUnlockFnc.State to 'fulfilled'
  }
}

// /*
const TheMutex                  = new Mutex();
var TestDelay                   = 1000;
async function Executor (ThisName, ThisLock){
  console.log(ThisName + " Running...", (ThisLock), ThisLock.name, "is", ThisLock.State, "IsLocked:", this.IsStillLocked());
  await WaitDelay(TestDelay);
  return ThisName + " Succeeded";
}
// AFTER TEST
setTimeout (() => {
  TheMutex.ReportStatus();
  // TheMutex.Execute        ("E", Executor);
}, 5 * TestDelay);

TheMutex.Execute        ("A", Executor);
TheMutex.AwaitExecute   ("B", Executor);
TheMutex.AwaitExecute   ("C", Executor);
TheMutex.Execute        ("D", Executor);

// In this release. 
// 1. Added IsStillLocked(). that check for the last _lock to be fully fulfilled
// 2. Added a separated ReleaseStack to track when the last release occur
// 3. Added GetCurrentStack and ReportStatus
// 4. Added _NextLock in the stack
// 5. Fixed issue between Execute and AwaitExecute 
// 6. Made _acquire private
// 7. Added an AfterTest Report

// */
