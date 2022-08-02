import { StatusBar } from 'expo-status-bar';
import React, {useState} from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, Button, ScrollView, Keyboard, TouchableWithoutFeedback, TouchableOpacity, KeyboardAvoidingView } from 'react-native';

export default function App() {
  const [route, setRoute] = useState('');
  const [inboundData, setInboundData] = useState('')
  const [outboundData, setOutboundData] = useState('')
  const [stopList, setStopList] = useState([])

  let getRouteData = async (route) => {
    setStopList([])
    if(!route){
      setInboundData('')
      setOutboundData('')
      return
    }
    setRoute(route)
    let url = 'https://data.etabus.gov.hk/v1/transport/kmb/route/' + route.toUpperCase()

    // get inbound data
    let inboundRouteData = await customFetch(url+'/inbound/1')
    let inboundOrigin = inboundRouteData['orig_tc']
    let inboundDest = inboundRouteData['dest_tc']
    if(inboundOrigin && inboundDest){
      setInboundData('往：'+inboundDest);  
    } else {
      setInboundData('')
    }
    

    // get outbound data
    let outboundRouteData = await customFetch(url+'/outbound/1')
    let outboundOrigin = outboundRouteData['orig_tc']
    let outboundDest = outboundRouteData['dest_tc']
    if(outboundOrigin && outboundDest){
      setOutboundData('往：'+outboundDest);  
    } else {
      setOutboundData('')
    }
  }

  const directionMapping = {
    inbound: 'I',
    outbound: 'O'
  }

  async function getRouteStopData(direction){
    Keyboard.dismiss()
    let url = 'https://data.etabus.gov.hk/v1/transport/kmb/route-stop/'+route.toUpperCase()+'/'+direction+'/1'
    let routeStopData = await customFetch(url)
    setStopList([])
    for(let stop of routeStopData){
      getStop(stop['stop'], stop['seq'], route.toUpperCase(), directionMapping[direction])
    }
  }

  async function getStop(stop, seq, route, direction){
    let url = 'https://data.etabus.gov.hk/v1/transport/kmb/stop/' + stop;
    let data = await customFetch(url)
    let name = (data['name_tc'])
    url = 'https://data.etabus.gov.hk/v1/transport/kmb/eta/'+stop+'/'+route+'/1'
    let detail = {
      name,
      seq,
      expand: false,
      stop,
      route,
      direction,
      eta: []
    }
    setStopList(stopList => [...stopList, detail])
  }

  async function getStopETA(stop, i){
    let stopId = stop['stop']
    let route = stop['route']
    let direction = stop['direction']
    let seq = stop['seq']
    let url = 'https://data.etabus.gov.hk/v1/transport/kmb/eta/'+stopId+'/'+route+'/1'
    let etaList = await customFetch(url)
    let newStopList = [...stopList]
    let newETAList = []
    for(let eta of etaList){
      // match the direction
      if(eta['dir'] === direction && eta['seq'] == seq){
        // calculate the ETA
        let etaTime = new Date(eta['eta'])
        let current = new Date(eta['data_timestamp'])
        let difference = etaTime.getTime() - current.getTime()
        if(difference < 0){continue}
        let showETA;
        let differenceInMin = Math.round(difference / (1000 * 60))
        if(differenceInMin == 0){
          showETA = '-'
        } else {
          showETA = differenceInMin
        }
        newETAList.push(showETA)
      }
    }
    // update with the array
    newStopList[i] = {
      ...newStopList[i],
      eta: newETAList,
      expand: true
    }
    setStopList(newStopList)
  }

  function toggleETA(stopObj, index){
    let i = (index['i'])
    let newStopList = [...stopList]
    newStopList[i] = {
      ...newStopList[i],
      expand: !newStopList[i]['expand']
    }
    if(newStopList[i]['expand']){
      let stop = stopObj['stop']
      getStopETA(stop, i)
    }
    setStopList(newStopList)
  }

  async function customFetch(url){
    let res = await fetch(url)
    let data = await res.json()
    return data['data']
  }


  return (
    
    <SafeAreaView style={styles.container}>


    <View style={{overflow: 'hidden', height: '80%', alignSelf: 'stretch'}}>
      <ScrollView 
        contentContainerStyle={styles.detailContainerFlex} 
        style={styles.detailContainer}
        removeClippedSubviews = 'true'
        >
        {stopList.map((stop, i)=>{
          if(!stop['expand']){
            return (
              <TouchableOpacity key={i} style={styles.detailCard} onPress={()=>toggleETA({stop}, {i})}>
                <Text style={{fontSize: 20, color: 'white'}} >{stop['name']}</Text>
              </TouchableOpacity>
              )
          } else {
            return (
              <TouchableOpacity key={i} style={styles.detailCard} onPress={()=>toggleETA({stop}, {i})}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
               <Text style={{fontSize: 20, marginBottom: 5, color: 'white'}}>{stop['name']}</Text>
               <View>
                 {stop['eta'].map((eta, i)=>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent:'space-around'}} key={i}>
                  <Text style={{fontSize: 18, color: 'white'}}>
                    {eta}
                  </Text>
                  <Text style={{color: 'white'}}>分鐘</Text>
                  </View>
                  )}
               </View>
               </View>
              </TouchableOpacity>
              )
          }
        }
          )}
      </ScrollView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS=== 'ios'? 'padding':'height'}
        style={styles.inputBoxWrapper}
      >
      <TouchableOpacity style={styles.route} onPress={()=>getRouteStopData('inbound')}>
        <Text style={{textAlign: 'center', fontSize: 20, color: 'white'}}>
          {inboundData}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.route} onPress={()=>getRouteStopData('outbound')}>
        <Text style={{textAlign: 'center', fontSize: 20, color: 'white'}}>
          {outboundData}
        </Text>
      </TouchableOpacity>

       <TextInput
        style = {styles.inputBox}
        placeholder = "Type route here"
        onChangeText = {newRoute=>getRouteData(newRoute)}
        defaultValue =''
        autoFocus={true}
        onSubmit = {()=>Keyboard.dismiss()}
        />
        </KeyboardAvoidingView>


    <StatusBar style='auto'/>
    </SafeAreaView>

    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
  },
  data: {
    width: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  stop: {
    margin: '10px'
  },
  inputBox: {
    height: 50,
    borderWidth: 1,
    borderColor: '#c0c0c0',
    borderRadius: 10,
    marginHorizontal: 5,
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 20,
    color: 'white'
  },
  detailContainerFlex: {
    alignItems: 'center',
  },
  detailContainer: {
    alignSelf: 'stretch',
    flexDirection: 'column',

  },
  detailCard: {
    shadowColor: 'white',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.26,
    elevation: 8,
    backgroundColor: 'black',
    padding: 20,
    borderRadius: 10,
    width: '95%',
    marginVertical: 5,
    },
  route: {
    alignSelf: 'stretch',
    marginTop: 5,
    marginBottom: 5,
  },
  inputBoxWrapper: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    backgroundColor: 'black',
    color: 'white'
  }
});
