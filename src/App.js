import{Application,Controller}from "https://unpkg.com/@hotwired/stimulus/dist/stimulus.js";import{ethers}from "./ethers-5.2.esm.min.js";window.Stimulus=Application.start()
Stimulus.handleError=(error,message,detail)=>{console.warn(message,detail)
ErrorTrackingSystem.captureException(error)}
const Web3Modal=window.Web3Modal.default;const WalletConnectProvider=window.WalletConnectProvider.default;const PRAGMA_ABI=["function balanceOf(address owner) view returns (uint256)","function getCirculatingSupply() view returns (uint256)","function _lastRebasedTime() view returns (uint256)"];const PRAGMA_ADDRESS="0x449f45deb9c57350130732733bd96aad7203342a"
const WFTM_ADDRESS="0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83"
const PAIR_ADDRESS="0x0a6a3317b72a37aba0130d4cd810b6db74a27129"
const RPC_PROVIDER="https://rpc.ftm.tools/"
const PRAGMA_REWARD=0.0002229
const ERC20_ABI=["function balanceOf(address owner) view returns (uint256)"];const TREASURY_HOLDINGS={"0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83":"0x2b4c76d0dc16be1c31d4c1dc53bf9b45987fc75c","0x04068da6c83afcfa0e13ba15a6696662335d5b75":"","0x6c021Ae822BEa943b2E66552bDe1D2696a53fbB7":"0x2a651563c9d3af67ae0388a5c8f89b867038089e"};Stimulus.register("home-dashboard",class extends Controller{static targets=["alertHome","supply","connect","disconnect","balance","pragmaBalance","next","pragmaNext","daily","pragmaDaily","fiveDays","pragmaFiveDays","treasuryBalance","rfvBalance","liquidityBalance","burntBalance","wallet","price","priceChange","marketCap","minutes","seconds"]
static contractProvider=null
static contract=null
static modal=null
static instance=null
static pragmaPrice=null
async connect(){this.contractProvider=new ethers.providers.JsonRpcProvider(RPC_PROVIDER)
this.contract=new ethers.Contract(PRAGMA_ADDRESS,PRAGMA_ABI,this.contractProvider)
this.pairContract=new ethers.Contract(WFTM_ADDRESS,ERC20_ABI,this.contractProvider)
const apiResponse=await axios.get("https://api.dexscreener.io/latest/dex/pairs/fantom/"+PAIR_ADDRESS)
this.pragmaPrice=apiResponse.data.pair.priceUsd
const priceChange=apiResponse.data.pair.priceChange.h24
let treasuryBalance=await this.contract.balanceOf("0x131b78F3961c90C364a7970B98988C219D56d62A")
let rfvBalance=await this.contract.balanceOf("0x186D5B8C9E6c6265071aAc228B145C32bEc1A0C6")
let operationWallet=await this.contract.balanceOf("0x58840Ef90A84302c46Ce9F77DAecF964187e29d5")
let operationMultisig=await this.contract.balanceOf("0xe8B151a86966e0375205f403267355B38960A158")
let liquidityBalance=await this.contract.balanceOf(PAIR_ADDRESS)
let supply=await this.contract.getCirculatingSupply()
let totalSupply=supply.sub(treasuryBalance).sub(rfvBalance).sub(operationWallet).sub(operationMultisig)
this.supplyTarget.innerHTML=ethers.utils.commify(Math.floor(ethers.utils.formatEther(totalSupply)))+" PRAGMA"
let marketCap=Math.floor(ethers.utils.formatEther(totalSupply))*this.pragmaPrice
this.marketCapTarget.innerHTML="$"+ethers.utils.commify(Math.floor(marketCap))
this.priceTarget.innerHTML="$"+this.pragmaPrice
let sign=""
if(priceChange>0){sign="+"}
this.priceChangeTarget.innerHTML=sign+priceChange+"%"
if(sign==""){this.priceChangeTarget.classList.remove("text-green-500")
this.priceChangeTarget.classList.add("text-red-500")}else{this.priceChangeTarget.classList.remove("text-red-500")
this.priceChangeTarget.classList.add("text-green-500")}
await this.getTreasuryValue()
await this.getNextRebase()
await this.getRfvValue()
await this.getLiquidityValue()
await this.getBurntValue()}
async connectWallet(){const providerOptions={walletconnect:{package:WalletConnectProvider,options:{rpc:{250:RPC_PROVIDER},}}};this.modal=new Web3Modal({cacheProvider:false,providerOptions,});this.instance=await this.modal.connect()
this.provider=new ethers.providers.Web3Provider(this.instance);this.network=await this.provider.getNetwork();this.chainId=this.network.chainId;this.connectTarget.classList.add("hidden")
this.disconnectTarget.classList.remove("hidden")
this.signer=this.provider.getSigner()
this.walletAddress=await this.signer.getAddress()
this.walletTarget.innerHTML=this.walletAddress
this.walletTarget.innerHTML=this.walletTarget.innerHTML.slice(0,6)+'...'+this.walletTarget.innerHTML.slice(this.walletTarget.innerHTML.length-4,this.walletTarget.innerHTML.length)
this.balance=await this.contract.balanceOf(this.walletAddress)
this.balanceTarget.innerHTML="$"+ethers.utils.commify(Math.floor(ethers.utils.formatUnits(this.balance,18)*this.pragmaPrice))
this.pragmaBalanceTarget.innerHTML=ethers.utils.commify(Math.floor(ethers.utils.formatUnits(this.balance,18)))+" PRAGMA"
let next=this.getReward(ethers.utils.formatEther(this.balance),1)
this.nextTarget.innerHTML="$"+ethers.utils.commify((next*this.pragmaPrice).toFixed(2))
this.pragmaNextTarget.innerHTML=ethers.utils.commify(Math.round(next))+" PRAGMA"
let daily=this.getReward(ethers.utils.formatEther(this.balance),96)
this.dailyTarget.innerHTML="$"+ethers.utils.commify((daily*this.pragmaPrice).toFixed(2))
this.pragmaDailyTarget.innerHTML=ethers.utils.commify(Math.round(daily))+" PRAGMA"
let fiveDays=this.getReward(ethers.utils.formatEther(this.balance),480)
this.fiveDaysTarget.innerHTML="$"+ethers.utils.commify((fiveDays*this.pragmaPrice).toFixed(2))
this.pragmaFiveDaysTarget.innerHTML=ethers.utils.commify(Math.round(fiveDays))+" PRAGMA"}
async disconnectWallet(){await this.modal.clearCachedProvider()
this.provider=null;this.walletTarget.innerHTML="";this.disconnectTarget.classList.add("hidden")
this.connectTarget.classList.remove("hidden")
this.balanceTarget.innerHTML="$0"}
async getNextRebase(){const rebaseTime=parseInt(await this.contract._lastRebasedTime())
const nextRebase=rebaseTime+900
const current=Math.floor(Date.now()/1000);let minutes=Math.floor((nextRebase-current)/60)
let seconds=(nextRebase-current)%60
this.minutesTarget.style='--value:'+minutes
this.secondsTarget.style='--value:'+seconds
setInterval(()=>{seconds=seconds>0?seconds-1:minutes<1?0:59
minutes=seconds==59&&minutes>0?minutes-1:minutes
this.minutesTarget.style='--value:'+minutes
this.secondsTarget.style='--value:'+seconds},1000)}
async getTreasuryValue(){let treasuryBalance=0
this.ftmPrice=0
for(let key in TREASURY_HOLDINGS){let contractHolding=new ethers.Contract(key,ERC20_ABI,this.contractProvider)
let ercBalance=await contractHolding.balanceOf("0x131b78F3961c90C364a7970B98988C219D56d62A")
if(TREASURY_HOLDINGS[key]!=""){let api=await axios.get("https://api.dexscreener.io/latest/dex/pairs/fantom/"
+TREASURY_HOLDINGS[key])
let price=api.data.pair.priceUsd
if(api.data.pair.baseToken.symbol=="WFTM"){this.ftmPrice=price}
treasuryBalance=treasuryBalance+ethers.utils.formatEther(ercBalance)*price}else{treasuryBalance=treasuryBalance+parseInt(ethers.utils.formatUnits(ercBalance,6))}}
let ftmBalance=await this.contractProvider.getBalance("0x131b78F3961c90C364a7970B98988C219D56d62A");ftmBalance=ethers.utils.formatEther(ftmBalance)*this.ftmPrice
treasuryBalance=treasuryBalance+ftmBalance
this.treasuryBalanceTarget.innerHTML="$"+ethers.utils.commify(Math.floor(treasuryBalance))}
async getRfvValue(){let ftmBalance=await this.contractProvider.getBalance("0x186D5B8C9E6c6265071aAc228B145C32bEc1A0C6");ftmBalance=ethers.utils.formatEther(ftmBalance)*this.ftmPrice
this.rfvBalanceTarget.innerHTML="$"+ethers.utils.commify(Math.floor(ftmBalance))}
async getLiquidityValue(){let balance=ethers.utils.formatEther(await this.pairContract.balanceOf(PAIR_ADDRESS))
this.liquidityBalanceTarget.innerHTML="$"+ethers.utils.commify(Math.floor(balance))}
async getBurntValue(){let dead=await this.contract.balanceOf("0x000000000000000000000000000000000000dEaD")
let zero=await this.contract.balanceOf("0x0000000000000000000000000000000000000000")
this.burntBalanceTarget.innerHTML=ethers.utils.commify(Math.floor(ethers.utils.formatEther(dead.add(zero))))+" PRAGMA"}
async addToken(){await ethereum.request({method:'wallet_watchAsset',params:{type:'ERC20',options:{address:"0x449f45deb9c57350130732733bd96aad7203342a",symbol:"PRAGMA",decimals:18,image:"https://assets.coingecko.com/coins/images/25080/small/cmc_logo.png"}}})}
getReward(value,rebaseNumber){return value*((1+PRAGMA_REWARD)**rebaseNumber-1)}})