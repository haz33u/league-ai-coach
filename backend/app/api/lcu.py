"""
LCU API endpoints - локальное подключение к League Client
"""
import httpx
import psutil
import re
import base64
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional

router = APIRouter()


def get_lcu_connection_info() -> Optional[Dict[str, Any]]:
    """
    Получить port и token из запущенного League Client
    """
    for process in psutil.process_iter(['name', 'cmdline']):
        try:
            if process.info['name'] in ['LeagueClientUx.exe', 'LeagueClientUx']:
                cmdline = ' '.join(process.info['cmdline'])
                
                # Извлекаем port
                port_match = re.search(r'--app-port=(\d+)', cmdline)
                # Извлекаем token
                token_match = re.search(r'--remoting-auth-token=([\w-]+)', cmdline)
                
                if port_match and token_match:
                    port = port_match.group(1)
                    token = token_match.group(1)
                    
                    # Создаём basic auth
                    auth = base64.b64encode(f"riot:{token}".encode()).decode()
                    
                    return {
                        "port": port,
                        "token": token,
                        "base_url": f"https://127.0.0.1:{port}",
                        "auth_header": f"Basic {auth}"
                    }
        
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    
    return None


@router.get("/connection-info")
async def get_connection_info():
    """
    Проверить подключение к LCU
    """
    lcu_info = get_lcu_connection_info()
    
    if not lcu_info:
        raise HTTPException(
            status_code=404, 
            detail="League Client not running or not accessible"
        )
    
    return {
        "connected": True,
        "port": lcu_info["port"],
        "base_url": lcu_info["base_url"]
    }


@router.get("/current-summoner")
async def get_current_summoner():
    """
    Получить данные о текущем summoner из LCU
    """
    lcu_info = get_lcu_connection_info()
    
    if not lcu_info:
        raise HTTPException(
            status_code=404,
            detail="League Client not running"
        )
    
    url = f"{lcu_info['base_url']}/lol-summoner/v1/current-summoner"
    
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(
                url,
                headers={"Authorization": lcu_info["auth_header"]},
                timeout=5.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to get summoner data from LCU"
                )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/ranked-stats")
async def get_ranked_stats():
    """
    Получить полные ranked данные (tier/rank/LP) из LCU
    """
    lcu_info = get_lcu_connection_info()
    
    if not lcu_info:
        raise HTTPException(
            status_code=404,
            detail="League Client not running"
        )
    
    url = f"{lcu_info['base_url']}/lol-ranked/v1/current-ranked-stats"
    
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(
                url,
                headers={"Authorization": lcu_info["auth_header"]},
                timeout=5.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Извлекаем ranked solo/duo данные
                queues = data.get("queues", [])
                
                result = {
                    "ranked_solo": None,
                    "ranked_flex": None
                }
                
                for queue in queues:
                    queue_type = queue.get("queueType")
                    
                    if queue_type == "RANKED_SOLO_5x5":
                        result["ranked_solo"] = {
                            "tier": queue.get("tier"),
                            "rank": queue.get("division"),
                            "lp": queue.get("leaguePoints", 0),
                            "wins": queue.get("wins", 0),
                            "losses": queue.get("losses", 0),
                            "total_games": queue.get("wins", 0) + queue.get("losses", 0),
                            "winrate": round((queue.get("wins", 0) / (queue.get("wins", 0) + queue.get("losses", 0))) * 100, 1) if (queue.get("wins", 0) + queue.get("losses", 0)) > 0 else 0
                        }
                    
                    elif queue_type == "RANKED_FLEX_SR":
                        result["ranked_flex"] = {
                            "tier": queue.get("tier"),
                            "rank": queue.get("division"),
                            "lp": queue.get("leaguePoints", 0),
                            "wins": queue.get("wins", 0),
                            "losses": queue.get("losses", 0),
                            "total_games": queue.get("wins", 0) + queue.get("losses", 0),
                            "winrate": round((queue.get("wins", 0) / (queue.get("wins", 0) + queue.get("losses", 0))) * 100, 1) if (queue.get("wins", 0) + queue.get("losses", 0)) > 0 else 0
                        }
                
                return result
            
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to get ranked stats from LCU"
                )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/health")
async def lcu_health():
    """
    Проверка здоровья LCU endpoints
    """
    lcu_info = get_lcu_connection_info()
    
    return {
        "lcu_connected": lcu_info is not None,
        "endpoint": "/api/lcu"
    }
