import React, { useCallback, useEffect, useState } from 'react'
import { Search, Plus, MessageCircle, Send, CheckCircle, Store, Mail } from 'lucide-react'

const assets = ['USDT','BTC','ETH','TON','USDC']
const words = {
 ru:{intro:'Публикуйте запросы на карточки, которых не хватает в вашей коллекции. Другие участники смогут откликнуться и написать вам.',create:'Создать запрос',number:'Номер карточки',qty:'Количество',price:'Желаемая цена за одну',currency:'Валюта',details:'Дополнительные условия',detailsHint:'Необязательно',publish:'Опубликовать запрос',open:'Активные запросы',mine:'Мои запросы',empty:'Пока нет активных запросов. Станьте первым!',respond:'Откликнуться',own:'Ваш запрос',close:'Закрыть запрос',closed:'Запрос закрыт',fulfilled:'Карточка найдена',chat:'Переписка',send:'Отправить',message:'Напишите сообщение...',back:'К списку запросов',market:'Перейти в маркетплейс',confirm:'Отметить карточку найденной?',loading:'Загрузка...',login:'Войдите в аккаунт, чтобы пользоваться запросами.',error:'Не удалось выполнить действие: ',sent:'Отклик отправлен. Теперь можно переписываться.',created:'Запрос опубликован.',closedOk:'Запрос закрыт.',foundOk:'Запрос отмечен как выполненный.',step:'Условия сделки обсуждайте здесь. Оплата и передача карточки — только через маркетплейс.',kicker:'VORTEX · КОЛЛЕКЦИОННОЕ СООБЩЕСТВО',title:'Ищу карточку',conversations:'Мои переписки',noChats:'Пока нет переписок. Откликнитесь на запрос или дождитесь отклика на свой.',yourRequest:'Ваш запрос',youResponded:'Вы откликнулись',openChat:'Открыть переписку',validation:'Проверьте номер, количество и цену.',with:'Собеседник',unknown:'Пользователь',chatHint:'Вы переписываетесь с',messageLabel:'Ваше сообщение',author:'Автор заявки',deleteRequest:'Удалить запрос',deleteConfirm:'Удалить этот запрос? Он исчезнет из списка активных объявлений.',deletedOk:'Запрос удалён.',},
 uk:{intro:'Публікуйте запити на картки, яких бракує у вашій колекції. Інші учасники зможуть відгукнутися та написати вам.',create:'Створити запит',number:'Номер картки',qty:'Кількість',price:'Бажана ціна за одну',currency:'Валюта',details:'Додаткові умови',detailsHint:'Необов’язково',publish:'Опублікувати запит',open:'Активні запити',mine:'Мої запити',empty:'Активних запитів поки немає.',respond:'Відгукнутися',own:'Ваш запит',close:'Закрити запит',closed:'Запит закрито',fulfilled:'Картку знайдено',chat:'Листування',send:'Надіслати',message:'Напишіть повідомлення...',back:'До списку',market:'Перейти до маркетплейсу',confirm:'Позначити картку знайденою?',loading:'Завантаження...',login:'Увійдіть, щоб користуватися запитами.',error:'Не вдалося виконати дію: ',sent:'Відгук надіслано.',created:'Запит опубліковано.',closedOk:'Запит закрито.',foundOk:'Запит виконано.',step:'Умови обговорюйте тут. Оплата й передавання — лише через маркетплейс.',kicker:'VORTEX · СПІЛЬНОТА КОЛЕКЦІОНЕРІВ',title:'Шукаю картку',conversations:'Мої переписки',noChats:'Поки немає переписок. Відгукніться на запит або дочекайтеся відповіді на свій.',yourRequest:'Ваш запит',youResponded:'Ви відгукнулися',openChat:'Відкрити переписку',validation:'Перевірте номер, кількість і ціну.',with:'Співрозмовник',unknown:'Користувач',chatHint:'Ви листуєтеся з',messageLabel:'Автор запиту',deleteRequest:'Видалити запит',deleteConfirm:'Видалити цей запит? Він зникне зі списку активних оголошень.',deletedOk:'Запит видалено.',},
 en:{intro:'Post requests for cards missing from your collection. Other members can respond and message you.',create:'Create request',number:'Card number',qty:'Quantity',price:'Desired price per card',currency:'Currency',details:'Additional details',detailsHint:'Optional',publish:'Publish request',open:'Active requests',mine:'My requests',empty:'No active requests yet.',respond:'Respond',own:'Your request',close:'Close request',closed:'Request closed',fulfilled:'Card found',chat:'Conversation',send:'Send',message:'Write a message...',back:'Back to requests',market:'Open marketplace',confirm:'Mark this request as fulfilled?',loading:'Loading...',login:'Sign in to use card requests.',error:'Action failed: ',sent:'Response sent.',created:'Request published.',closedOk:'Request closed.',foundOk:'Request marked fulfilled.',step:'Discuss terms here. Payment and card transfer must happen through the marketplace.',kicker:'VORTEX · COLLECTOR COMMUNITY',title:'Looking for a card',conversations:'My conversations',noChats:'No conversations yet. Respond to a request or wait for someone to respond to yours.',yourRequest:'Your request',youResponded:'You responded',openChat:'Open conversation',validation:'Check the card number, quantity, and price.',with:'Chatting with',unknown:'User',chatHint:'You are messaging',messageLabel:'Request author',deleteRequest:'Delete request',deleteConfirm:'Delete this request? It will disappear from the active listings.',deletedOk:'Request deleted.',},
 de:{intro:'Erstellen Sie Anfragen für Karten, die Ihrer Sammlung fehlen. Andere Mitglieder können antworten und Ihnen schreiben.',create:'Anfrage erstellen',number:'Kartennummer',qty:'Anzahl',price:'Wunschpreis pro Karte',currency:'Währung',details:'Zusätzliche Angaben',detailsHint:'Optional',publish:'Anfrage veröffentlichen',open:'Aktive Anfragen',mine:'Meine Anfragen',empty:'Noch keine aktiven Anfragen.',respond:'Antworten',own:'Ihre Anfrage',close:'Anfrage schließen',closed:'Anfrage geschlossen',fulfilled:'Karte gefunden',chat:'Nachrichten',send:'Senden',message:'Nachricht schreiben...',back:'Zurück',market:'Marktplatz öffnen',confirm:'Als erfüllt markieren?',loading:'Laden...',login:'Bitte anmelden, um Anfragen zu nutzen.',error:'Aktion fehlgeschlagen: ',sent:'Antwort gesendet.',created:'Anfrage veröffentlicht.',closedOk:'Anfrage geschlossen.',foundOk:'Als erfüllt markiert.',step:'Bedingungen hier besprechen. Zahlung und Übertragung nur über den Marktplatz.',kicker:'VORTEX · SAMMLER-COMMUNITY',title:'Ich suche eine Karte',conversations:'Meine Nachrichten',noChats:'Noch keine Nachrichten. Antworten Sie auf eine Anfrage oder warten Sie auf eine Antwort auf Ihre Anfrage.',yourRequest:'Ihre Anfrage',youResponded:'Sie haben geantwortet',openChat:'Nachricht öffnen',validation:'Überprüfen Sie Kartennummer, Anzahl und Preis.',with:'Gesprächspartner',unknown:'Benutzer',chatHint:'Sie schreiben mit',messageLabel:'Anfragender',deleteRequest:'Anfrage löschen',deleteConfirm:'Diese Anfrage löschen? Sie wird aus den aktiven Anzeigen entfernt.',deletedOk:'Anfrage gelöscht.',},
 fr:{intro:'Publiez des demandes pour les cartes manquantes à votre collection. Les autres membres peuvent répondre et vous écrire.',create:'Créer une demande',number:'Numéro de carte',qty:'Quantité',price:'Prix souhaité par carte',currency:'Devise',details:'Détails supplémentaires',detailsHint:'Facultatif',publish:'Publier la demande',open:'Demandes actives',mine:'Mes demandes',empty:'Aucune demande active pour le moment.',respond:'Répondre',own:'Votre demande',close:'Fermer la demande',closed:'Demande fermée',fulfilled:'Carte trouvée',chat:'Conversation',send:'Envoyer',message:'Écrire un message...',back:'Retour',market:'Ouvrir le marché',confirm:'Marquer comme terminée ?',loading:'Chargement...',login:'Connectez-vous pour utiliser les demandes.',error:'Échec : ',sent:'Réponse envoyée.',created:'Demande publiée.',closedOk:'Demande fermée.',foundOk:'Demande terminée.',step:'Discutez ici. Paiement et transfert uniquement via la marketplace.',kicker:'VORTEX · COMMUNAUTÉ DE COLLECTIONNEURS',title:'Je cherche une carte',conversations:'Mes conversations',noChats:'Aucune conversation pour le moment. Répondez à une demande ou attendez une réponse à la vôtre.',yourRequest:'Votre demande',youResponded:'Vous avez répondu',openChat:'Ouvrir la conversation',validation:'Vérifiez le numéro de carte, la quantité et le prix.',with:'Interlocuteur',unknown:'Utilisateur',chatHint:'Vous échangez avec',messageLabel:'Auteur de la demande',deleteRequest:'Supprimer la demande',deleteConfirm:'Supprimer cette demande ? Elle disparaîtra des annonces actives.',deletedOk:'Demande supprimée.'}
}
export default function WantedSection({ supabase, user, language='ru', onNotice, onMarketplace }) {
 const c=words[language]||words.ru
 const [requests,setRequests]=useState([]),[requestProfiles,setRequestProfiles]=useState({}),[busy,setBusy]=useState(false),[showForm,setShowForm]=useState(false)
 const [card,setCard]=useState(''),[quantity,setQuantity]=useState('1'),[price,setPrice]=useState(''),[asset,setAsset]=useState('USDT'),[details,setDetails]=useState('')
 const [thread,setThread]=useState(null),[messages,setMessages]=useState([]),[reply,setReply]=useState('')
 const [responses,setResponses]=useState([]),[view,setView]=useState('requests'),[conversations,setConversations]=useState([]),[otherUser,setOtherUser]=useState(null)
 const loadConversations=useCallback(async()=>{
  if(!user){setConversations([]);return}
  const {data:mine,error:mineError}=await supabase.from('card_requests').select('id,card_number,requester_id,status,created_at').eq('requester_id',user.id)
  if(mineError){onNotice(c.error+mineError.message);return}
  const ownIds=(mine||[]).map(x=>x.id)
  const [a,b]=await Promise.all([ownIds.length?supabase.from('card_request_responses').select('id,request_id,responder_id,created_at').in('request_id',ownIds):Promise.resolve({data:[],error:null}),supabase.from('card_request_responses').select('id,request_id,responder_id,created_at').eq('responder_id',user.id)])
  if(a.error||b.error){onNotice(c.error+(a.error||b.error).message);return}
  const unique=new Map([...(a.data||[]),...(b.data||[])].map(x=>[x.id,x]));const rows=[...unique.values()]
  if(!rows.length){setConversations([]);return}
  const ids=[...new Set(rows.map(x=>x.request_id))]
  const {data:reqs,error}=await supabase.from('card_requests').select('id,card_number,requester_id,status').in('id',ids)
  if(error){onNotice(c.error+error.message);return}
  const map=new Map((reqs||[]).map(x=>[x.id,x]))
  const joined=rows.map(x=>({response:x,request:map.get(x.request_id)})).filter(x=>x.request)
  const otherIds=[...new Set(joined.map(x=>x.request.requester_id===user.id?x.response.responder_id:x.request.requester_id).filter(Boolean))]
  let profilesById={}
  if(otherIds.length){const {data:profiles}=await supabase.from('user_profiles').select('user_id,username,avatar_url').in('user_id',otherIds);profilesById=Object.fromEntries((profiles||[]).map(p=>[p.user_id,p]))}
  setConversations(joined.map(x=>{const otherId=x.request.requester_id===user.id?x.response.responder_id:x.request.requester_id;return {...x,otherId,otherProfile:profilesById[otherId]||{}}}).sort((x,y)=>new Date(y.response.created_at)-new Date(x.response.created_at)))
 },[supabase,user?.id,language])
 const load=useCallback(async()=>{
  if(!user){setRequests([]);setRequestProfiles({});return}
  setBusy(true)
  const {data,error}=await supabase.from('card_requests').select('*').neq('status','deleted').order('created_at',{ascending:false}).limit(100)
  if(error){onNotice(c.error+error.message);setBusy(false);return}
  const rows=data||[];setRequests(rows)
  const ownerIds=[...new Set(rows.map(x=>x.requester_id).filter(Boolean))]
  if(ownerIds.length){
   const {data:profiles, error:profileError}=await supabase.from('user_profiles').select('user_id,username,avatar_url').in('user_id',ownerIds)
   if(profileError) onNotice(c.error+profileError.message)
   else setRequestProfiles(Object.fromEntries((profiles||[]).map(p=>[p.user_id,p])))
  }else setRequestProfiles({})
  setBusy(false)
 },[supabase,user?.id,language])
 useEffect(()=>{load();loadConversations()},[load,loadConversations])
 const create=async e=>{
  e.preventDefault();if(!user){onNotice(c.login);return}
  const q=Number(quantity),p=Number(price)
  if(!card.trim()||!Number.isInteger(q)||q<1||!Number.isFinite(p)||p<=0){onNotice(c.validation);return}
  setBusy(true)
  const {error}=await supabase.from('card_requests').insert({requester_id:user.id,card_number:card.trim(),quantity:q,desired_price:p,asset_code:asset,details:details.trim()})
  setBusy(false);if(error){onNotice(c.error+error.message);return}
  setCard('');setQuantity('1');setPrice('');setDetails('');setShowForm(false);onNotice(c.created);load()
 }
 const openThread=async (request,responseId)=>{
  if(!user)return false
  setBusy(true)
  try{
   let id=responseId
   if(!id){
    const {data:existing,error:existingError}=await supabase.from('card_request_responses').select('id').eq('request_id',request.id).eq('responder_id',user.id).maybeSingle()
    if(existingError)throw existingError
    id=existing?.id
    if(!id){
     const {data,error}=await supabase.from('card_request_responses').insert({request_id:request.id,responder_id:user.id}).select('id').single()
     if(error)throw error
     id=data.id
    }
   }
   const {data,error}=await supabase.from('card_request_messages').select('id,response_id,sender_id,body,created_at').eq('response_id',id).order('created_at')
   if(error)throw error
   const {data:responseRow,error:responseError}=await supabase.from('card_request_responses').select('responder_id').eq('id',id).maybeSingle()
   if(responseError)throw responseError
   const otherId=request.requester_id===user.id?responseRow?.responder_id:request.requester_id
   let profile=null
   if(otherId){const {data:p,error:profileError}=await supabase.from('user_profiles').select('user_id,username,avatar_url').eq('user_id',otherId).maybeSingle();if(profileError)throw profileError;profile=p}
   setOtherUser({id:otherId,username:profile?.username||c.unknown,avatar_url:profile?.avatar_url||''})
   setThread({request,responseId:id});setMessages(data||[]);setReply('');setView('requests')
   const {data:all,error:allError}=await supabase.from('card_request_responses').select('id,request_id,responder_id').eq('request_id',request.id)
   if(allError)throw allError
   setResponses(all||[])
   setBusy(false)
   return true
  }catch(error){setBusy(false);onNotice(c.error+error.message);return false}
 }
 const send=async e=>{
  e.preventDefault();if(!reply.trim()||!thread)return
  const {data,error}=await supabase.from('card_request_messages').insert({response_id:thread.responseId,sender_id:user.id,body:reply.trim()}).select('id,response_id,sender_id,body,created_at').single()
  if(error){onNotice(c.error+error.message);return}
  setMessages(v=>[...v,data]);setReply('')
 }
 const respond=async request=>{
  if(!user){onNotice(c.login);return}
  if(request.requester_id===user.id){onNotice(c.own);return}
  const opened=await openThread(request,null);if(opened)onNotice(c.sent)
 }
 const deleteRequest=async(request)=>{
  if(!user||request?.requester_id!==user.id||busy)return
  if(!window.confirm(c.deleteConfirm))return
  setBusy(true)
  const {error}=await supabase.from('card_requests').update({status:'deleted',updated_at:new Date().toISOString()}).eq('id',request.id).eq('requester_id',user.id)
  setBusy(false)
  if(error){onNotice(c.error+error.message);return}
  setRequests(v=>v.filter(x=>x.id!==request.id))
  if(thread?.request?.id===request.id){setThread(null);setOtherUser(null)}
  onNotice(c.deletedOk)
 }
 const close=async(status)=>{
  if(!thread && !status)return
  const request=thread?.request
  if(!request||request.requester_id!==user.id)return
  const {error}=await supabase.from('card_requests').update({status,updated_at:new Date().toISOString()}).eq('id',request.id)
  if(error){onNotice(c.error+error.message);return}
  setThread(null);setOtherUser(null);onNotice(status==='fulfilled'?c.foundOk:c.closedOk);load()
 }
 if(!user)return <section className="wanted-archive"><div className="wanted-hero"><div className="wanted-kicker"><Search size={16}/> {c.kicker}</div><h2>{c.title}</h2><p>{c.intro}</p></div><p>{c.login}</p></section>
 if(view==='chats'&&!thread)return <section className="wanted-archive"><div className="wanted-toolbar"><h2>{c.chat}</h2><button className="outline" onClick={()=>setView('requests')}>{c.back}</button></div>{conversations.length===0?<div className="panel wanted-empty">{c.noChats}</div>:<div className="wanted-list">{conversations.map(item=><article className="panel wanted-card" key={item.response.id}><div><span className="wanted-card-number">#{item.request.card_number}</span><span className="wanted-card-status">{item.request.requester_id===user.id?c.yourRequest:c.youResponded}</span><span className="wanted-chat-person">{c.with}: <b>{item.otherProfile?.username||c.unknown}</b></span></div><small>{new Date(item.response.created_at).toLocaleString()}</small><div className="wanted-actions"><button className="primary" onClick={()=>openThread(item.request,item.response.id)}><MessageCircle size={16}/>{c.chat}</button></div></article>)}</div>}</section>
 if(thread && !thread.responseId)return <section className="wanted-archive"><button className="outline" onClick={()=>setThread(null)}>{c.back}</button><div className="panel wanted-thread"><h2>{c.chat}: #{thread.request.card_number}</h2>{responses.length===0?<p>{c.empty}</p>:responses.map(x=><button className="outline" key={x.id} onClick={()=>openThread(thread.request,x.id)}>{c.openChat} · {x.responder_id.slice(0,8)}</button>)}</div></section>
 if(thread)return <section className="wanted-archive"><button className="outline" onClick={()=>setThread(null)}>{c.back}</button><div className="panel wanted-thread"><h2>{c.chat}: #{thread.request.card_number}</h2><div className="wanted-chat-recipient">{otherUser?.avatar_url?<img src={otherUser.avatar_url} alt=""/>:<span className="wanted-avatar-fallback">{(otherUser?.username||c.unknown).slice(0,1).toUpperCase()}</span>}<div><small>{c.chatHint}</small><b>{otherUser?.username||c.unknown}</b></div></div><p>{c.step}</p><div className="wanted-messages">{messages.map(m=><div className={m.sender_id===user.id?'wanted-message mine':'wanted-message'} key={m.id}><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}</div><form onSubmit={send} className="wanted-send"><label className="wanted-message-input"><span>{c.messageLabel}</span><input type="text" inputMode="text" autoComplete="off" value={reply} onChange={e=>setReply(e.target.value)} placeholder={c.message} maxLength="2000" required/></label><button type="submit" className="primary wanted-send-button" disabled={busy||!reply.trim()}><Send size={16}/>{c.send}</button></form>{thread.request.requester_id===user.id&&thread.request.status==='open'&&<div className="wanted-actions"><button className="outline" onClick={()=>close('closed')}>{c.close}</button><button className="primary" onClick={()=>close('fulfilled')}><CheckCircle size={16}/>{c.fulfilled}</button></div>}</div></section>
 return <section className="wanted-archive"><div className="wanted-hero"><div className="wanted-kicker"><Search size={16}/> {c.kicker}</div><h2>{c.title}</h2><p>{c.intro}</p></div>
 <div className="wanted-toolbar"><h3>{c.open}</h3><div className="wanted-toolbar-actions"><button className="outline" onClick={()=>{loadConversations();setView("chats")}}><Mail size={16}/>{c.conversations}</button><button className="primary" onClick={()=>setShowForm(v=>!v)}><Plus size={17}/>{c.create}</button></div></div>
 {showForm&&<form className="panel wanted-form" onSubmit={create}><label>{c.number}<input value={card} onChange={e=>setCard(e.target.value)} maxLength="40" required placeholder="001"/></label><label>{c.qty}<input type="number" min="1" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} required/></label><label>{c.price}<input type="number" min="0.00000001" step="any" value={price} onChange={e=>setPrice(e.target.value)} required/></label><label>{c.currency}<select value={asset} onChange={e=>setAsset(e.target.value)}>{assets.map(a=><option key={a}>{a}</option>)}</select></label><label className="wanted-wide">{c.details}<textarea value={details} onChange={e=>setDetails(e.target.value)} maxLength="1000" placeholder={c.detailsHint}/></label><button className="primary" disabled={busy}>{busy?c.loading:c.publish}</button></form>}
 {busy&&!requests.length?<p>{c.loading}</p>:requests.length===0?<div className="panel wanted-empty">{c.empty}</div>:<div className="wanted-list">{requests.map(r=><article className="panel wanted-card" key={r.id}><div><span className="wanted-card-number">#{r.card_number}</span><span className="wanted-card-status">{r.status==='open'?c.open:r.status==='fulfilled'?c.fulfilled:c.closed}</span></div><div className="wanted-request-author"><span className="wanted-request-avatar">{(requestProfiles[r.requester_id]?.username||c.unknown).slice(0,1).toUpperCase()}</span><span><small>{c.author}</small><b>{requestProfiles[r.requester_id]?.username||c.unknown}</b></span></div><h3>{r.quantity} × {Number(r.desired_price).toLocaleString('en-US',{maximumFractionDigits:8})} {r.asset_code}</h3>{r.details&&<p>{r.details}</p>}<small>{new Date(r.created_at).toLocaleString()}</small><div className="wanted-actions">{r.requester_id===user.id?<><button className="outline" onClick={async()=>{const {data,error}=await supabase.from('card_request_responses').select('id,request_id,responder_id').eq('request_id',r.id);if(error){onNotice(c.error+error.message);return}setResponses(data||[]);setThread({request:r,responseId:null});setOtherUser(null);setMessages([])}}>{c.mine}</button>{r.status==='open'&&<button className="outline" disabled={busy} onClick={()=>deleteRequest(r)}>{c.deleteRequest}</button>}<button className="outline" onClick={async()=>{const {error}=await supabase.from('card_requests').update({status:'closed'}).eq('id',r.id);if(error)onNotice(c.error+error.message);else{onNotice(c.closedOk);load()}}}>{c.close}</button>}</>:<button className="primary" disabled={r.status!=='open'} onClick={()=>respond(r)}><MessageCircle size={16}/>{c.respond}</button>}</div></article>)}</div>}
 <p className="wanted-rule">{c.step} <button className="outline" onClick={onMarketplace}><Store size={15}/>{c.market}</button></p>
 </section>
}
