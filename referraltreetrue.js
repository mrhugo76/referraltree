<script>
// 检查依赖库是否正确加载
function checkDependencies() {
    const dependencyErrors = [];
    
    // 检查 ethers
    if (typeof ethers === 'undefined') {
        dependencyErrors.push('ethers.js 库未加载');
    }
    
    // 检查 firebase
    if (typeof firebase === 'undefined') {
        dependencyErrors.push('Firebase 库未加载');
    } else if (typeof firebase.firestore === 'undefined') {
        dependencyErrors.push('Firebase Firestore 模块未加载');
    }
    
    // 如果有错误，显示错误信息
    if (dependencyErrors.length > 0) {
        const errorContainer = document.getElementById('dependency-errors');
        errorContainer.classList.remove('hidden');
        console.error('依赖库加载错误:', dependencyErrors);
        return false;
    }
    
    return true;
}

// 等待页面加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 检查依赖库
    if (!checkDependencies()) {
        return;
    }
    
    // Firebase 初始化
    const firebaseConfig = {
        apiKey: "AIzaSyCDBKbV6FwSow5W-L3bJkWJuyoGY7nmHQ0",
        authDomain: "referralpetro.firebaseapp.com",
        projectId: "referralpetro",
        storageBucket: "referralpetro.firebasestorage.app",
        messagingSenderId: "893494591505",
        appId: "1:893494591505:web:1547807368b1a33fd6f1b0",
    };

    try {
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // Polygon API 配置
        const TOKEN_ADDRESS = '0xa146a506e852f874f2d4803764597cb95195bf52';
        const POLYGON_API_KEY = '2SKGP8CTWDN6H4PVAPVXAFDK9Q2Q7JYEMV';
        const POLYGON_API_URL = 'https://api.polygonscan.com/api';

        // 全局变量
        let currentAccount = null;
        let provider = null;
        let currentUserData = null;
        
        // 隐藏/显示状态
        let directReferralsVisible = true;
        let orgTotalVisible = true;

        // 分页配置
        const ITEMS_PER_PAGE = 10;
        let downlinesCurrentPage = 1;
        let manualDownlinesCurrentPage = 1;

        // DOM 元素
        const connectButton = document.getElementById('connect-button');
        const disconnectButton = document.getElementById('disconnect-button');
        const walletNotConnected = document.getElementById('wallet-not-connected');
        const walletConnected = document.getElementById('wallet-connected');
        const connectedAddress = document.getElementById('connected-address');
        const referralDataContainer = document.getElementById('referral-data-container');
        const loadingStats = document.getElementById('loading-stats');
        const statsContent = document.getElementById('stats-content');
        const referredByElement = document.getElementById('referredBy');
        const manualReferrerTag = document.getElementById('manual-referrer-tag');
        const autoReferrerTag = document.getElementById('auto-referrer-tag');
        const directReferralsElement = document.getElementById('directReferrals');
        const orgTotalElement = document.getElementById('orgTotal');
        const lastUpdatedElement = document.getElementById('last-updated');
        const downlinesContainer = document.getElementById('downlines-container');
        const manualDownlinesContainer = document.getElementById('manual-downlines-container');
        const manualDownlinesList = document.getElementById('manual-downlines-list');
        const manualReferralsContainer = document.getElementById('manual-referrals-container');
        const manualReferralsElement = document.getElementById('manualReferrals');
        const refreshButton = document.getElementById('refresh-button');
        const alertContainer = document.getElementById('alert-container');
        const alert = document.getElementById('alert');
        const alertMessage = document.getElementById('alert-message');
        
        // 分页元素
        const downlinesPaginationInfo = document.getElementById('downlines-pagination-info');
        const downlinesStart = document.getElementById('downlines-start');
        const downlinesEnd = document.getElementById('downlines-end');
        const downlinesTotal = document.getElementById('downlines-total');
        const downlinesPagination = document.getElementById('downlines-pagination');
        const downlinesPrevPage = document.getElementById('downlines-prev-page');
        const downlinesNextPage = document.getElementById('downlines-next-page');
        const downlinesPageNumbers = document.getElementById('downlines-page-numbers');
        
        const manualDownlinesPaginationInfo = document.getElementById('manual-downlines-pagination-info');
        const manualDownlinesStart = document.getElementById('manual-downlines-start');
        const manualDownlinesEnd = document.getElementById('manual-downlines-end');
        const manualDownlinesTotal = document.getElementById('manual-downlines-total');
        const manualDownlinesPagination = document.getElementById('manual-downlines-pagination');
        const manualDownlinesPrevPage = document.getElementById('manual-downlines-prev-page');
        const manualDownlinesNextPage = document.getElementById('manual-downlines-next-page');
        const manualDownlinesPageNumbers = document.getElementById('manual-downlines-page-numbers');
        
        // 隐藏/显示切换按钮
        const toggleDirectReferrals = document.getElementById('toggle-direct-referrals');
        const toggleOrgTotal = document.getElementById('toggle-org-total');

        // 工具函数

        // 显示提示信息
        function showAlert(message, type = 'error') {
            alertContainer.classList.remove('hidden');
            alertMessage.textContent = message;
            alert.className = `alert alert-${type}`;
            
            // 5秒后自动隐藏
            setTimeout(() => {
                alertContainer.classList.add('hidden');
            }, 5000);
        }

        // 格式化地址显示
        function formatAddress(address) {
            if (!address) return '无';
            return `${address.slice(0, 6)}...${address.slice(-4)}`;
        }

        // 格式化完整地址
        function formatFullAddress(address) {
            if (!address) return '无';
            return address;
        }

        // 格式化日期
        function formatDate(dateStr) {
            if (!dateStr) return '未知';
            const date = new Date(dateStr);
            return date.toLocaleString('zh-CN');
        }

        // 检查是否可以刷新数据 - 修改为5秒限制（用于测试）
        function canRefreshData(lastUpdated) {
            if (!lastUpdated) return true;
            
            const lastUpdate = new Date(lastUpdated);
            const now = new Date();
            const secondsDiff = (now.getTime() - lastUpdate.getTime()) / 1000;
            
            // 只需要等待5秒即可再次刷新（测试用）
            return secondsDiff >= 5;
        }

        // 切换直接推荐人数的可见性
        function toggleDirectReferralsVisibility() {
            directReferralsVisible = !directReferralsVisible;
            updateDirectReferralsVisibility();
        }

        // 更新直接推荐人数的可见性
        function updateDirectReferralsVisibility() {
            if (directReferralsVisible) {
                directReferralsElement.textContent = currentUserData ? `${currentUserData.directReferrals || 0} 人` : '0 人';
                toggleDirectReferrals.innerHTML = `
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            } else {
                directReferralsElement.textContent = '******';
                directReferralsElement.classList.add('value-hidden');
                toggleDirectReferrals.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94"></path>
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
                    <path d="m1 1 22 22"></path>
                `;
            }
        }

        // 切换组织总人数的可见性
        function toggleOrgTotalVisibility() {
            orgTotalVisible = !orgTotalVisible;
            updateOrgTotalVisibility();
        }

        // 更新组织总人数的可见性
        function updateOrgTotalVisibility() {
            if (orgTotalVisible) {
                orgTotalElement.textContent = currentUserData ? `${currentUserData.orgTotal || 0} 人` : '0 人';
                toggleOrgTotal.innerHTML = `
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            } else {
                orgTotalElement.textContent = '******';
                orgTotalElement.classList.add('value-hidden');
                toggleOrgTotal.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94"></path>
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
                    <path d="m1 1 22 22"></path>
                `;
            }
        }

        // 获取有效的推荐人地址（优先使用手动设置的推荐人）
        function getEffectiveReferrer(userData) {
            return userData.manualReferredBy || userData.referredBy || null;
        }

        // 创建分页按钮
        function createPaginationButtons(container, totalPages, currentPage, onPageChange) {
            container.innerHTML = '';
            
            // 最多显示5个页码按钮
            const maxPageButtons = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
            let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
            
            // 调整起始页，确保显示足够的页码按钮
            if (endPage - startPage + 1 < maxPageButtons && startPage > 1) {
                startPage = Math.max(1, endPage - maxPageButtons + 1);
            }
            
            // 创建页码按钮
            for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement('button');
                pageButton.className = `page-button ${i === currentPage ? 'active' : ''}`;
                pageButton.textContent = i;
                pageButton.addEventListener('click', () => onPageChange(i));
                container.appendChild(pageButton);
            }
        }

        // 更新分页信息和控件
        function updatePagination(type, items, currentPage) {
            const isDownlines = type === 'downlines';
            const container = isDownlines ? downlinesContainer : manualDownlinesList;
            const paginationInfo = isDownlines ? downlinesPaginationInfo : manualDownlinesPaginationInfo;
            const pagination = isDownlines ? downlinesPagination : manualDownlinesPagination;
            const prevButton = isDownlines ? downlinesPrevPage : manualDownlinesPrevPage;
            const nextButton = isDownlines ? downlinesNextPage : manualDownlinesNextPage;
            const pageNumbers = isDownlines ? downlinesPageNumbers : manualDownlinesPageNumbers;
            const startElement = isDownlines ? downlinesStart : manualDownlinesStart;
            const endElement = isDownlines ? downlinesEnd : manualDownlinesEnd;
            const totalElement = isDownlines ? downlinesTotal : manualDownlinesTotal;
            
            if (!items || items.length === 0) {
                container.innerHTML = `<p>暂无${isDownlines ? '直接推荐' : '手动添加'}的地址</p>`;
                paginationInfo.classList.add('hidden');
                pagination.classList.add('hidden');
                return;
            }
            
            // 计算总页数
            const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
            
            // 确保当前页在有效范围内
            currentPage = Math.max(1, Math.min(currentPage, totalPages));
            
            // 计算当前页的起始和结束索引
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, items.length);
            
            // 更新分页信息
            startElement.textContent = startIndex + 1;
            endElement.textContent = endIndex;
            totalElement.textContent = items.length;
            paginationInfo.classList.remove('hidden');
            
            // 显示当前页的地址
            let html = '';
            for (let i = startIndex; i < endIndex; i++) {
                html += `<div class="address-item">${items[i]}</div>`;
            }
            container.innerHTML = html;
            
            // 更新分页控件
            prevButton.disabled = currentPage === 1;
            nextButton.disabled = currentPage === totalPages;
            
            // 创建页码按钮
            createPaginationButtons(pageNumbers, totalPages, currentPage, (page) => {
                if (isDownlines) {
                    downlinesCurrentPage = page;
                    updatePagination('downlines', currentUserData.downlines, page);
                } else {
                    manualDownlinesCurrentPage = page;
                    updatePagination('manualDownlines', currentUserData.manualDownlines, page);
                }
            });
            
            pagination.classList.remove('hidden');
        }

        // 连接钱包
        async function connectMetamask() {
            try {
                // 检查是否安装了MetaMask
                if (window.ethereum) {
                    provider = new ethers.providers.Web3Provider(window.ethereum);
                    
                    // 请求账户访问
                    const accounts = await provider.send("eth_requestAccounts", []);
                    
                    if (accounts.length === 0) {
                        showAlert('没有找到账户，请确保您的钱包已解锁');
                        return;
                    }
                    
                    // 检查是否连接到 Polygon 网络
                    const network = await provider.getNetwork();
                    const chainId = network.chainId;
                    
                    // Polygon Mainnet chainId 是 137，Mumbai Testnet 是 80001
                    if (chainId !== 137 && chainId !== 80001) {
                        try {
                            await window.ethereum.request({
                                method: "wallet_switchEthereumChain",
                                params: [{ chainId: "0x89" }], // 137 in hex
                            });
                        } catch (switchError) {
                            // 如果网络不存在，添加网络
                            if (switchError.code === 4902) {
                                await window.ethereum.request({
                                    method: "wallet_addEthereumChain",
                                    params: [
                                        {
                                            chainId: "0x89",
                                            chainName: "Polygon Mainnet",
                                            nativeCurrency: {
                                                name: "MATIC",
                                                symbol: "MATIC",
                                                decimals: 18
                                            },
                                            rpcUrls: ["https://polygon-rpc.com/"],
                                            blockExplorerUrls: ["https://polygonscan.com/"]
                                        },
                                    ],
                                });
                            } else {
                                showAlert('请切换到 Polygon 网络');
                                return;
                            }
                        }
                    }
                    
                    currentAccount = accounts[0];
                    
                    // 更新 UI
                    connectedAddress.textContent = currentAccount;
                    connectButton.classList.add('hidden');
                    disconnectButton.classList.remove('hidden');
                    walletNotConnected.classList.add('hidden');
                    walletConnected.classList.remove('hidden');
                    referralDataContainer.classList.remove('hidden');
                    
                    // 获取用户数据
                    await getUserData(currentAccount);
                    
                    return currentAccount;
                } else {
                    showAlert('请安装 MetaMask 钱包插件');
                }
            } catch (error) {
                console.error('连接钱包错误:', error);
                showAlert('连接钱包失败: ' + error.message);
            }
        }

        // 断开钱包连接
        function disconnectWallet() {
            currentAccount = null;
            currentUserData = null;
            
            // 更新 UI
            connectButton.classList.remove('hidden');
            disconnectButton.classList.add('hidden');
            walletNotConnected.classList.remove('hidden');
            walletConnected.classList.add('hidden');
            referralDataContainer.classList.add('hidden');
            
            // 重置数据显示
            referredByElement.textContent = '无推荐人';
            manualReferrerTag.classList.add('hidden');
            autoReferrerTag.classList.add('hidden');
            directReferralsElement.textContent = '0 人';
            orgTotalElement.textContent = '0 人';
            lastUpdatedElement.textContent = '最后更新时间: 未知';
            downlinesContainer.innerHTML = '<p>暂无直接推荐的地址</p>';
            manualReferralsContainer.classList.add('hidden');
            manualDownlinesContainer.classList.add('hidden');
            
            // 重置分页
            downlinesCurrentPage = 1;
            manualDownlinesCurrentPage = 1;
            downlinesPaginationInfo.classList.add('hidden');
            downlinesPagination.classList.add('hidden');
            manualDownlinesPaginationInfo.classList.add('hidden');
            manualDownlinesPagination.classList.add('hidden');
        }

        // 获取用户推荐数据
        async function getUserData(wallet) {
            try {
                loadingStats.classList.remove('hidden');
                statsContent.classList.add('hidden');
                
                // 从 Firebase 获取用户数据
                const userRef = db.collection('users').doc(wallet.toLowerCase());
                const doc = await userRef.get();
                
                if (doc.exists) {
                    // 显示缓存数据
                    const userData = doc.data();
                    currentUserData = userData;
                    displayUserData(userData);
                    
                    // 检查是否可以刷新数据
                    const refreshEnabled = canRefreshData(userData.lastUpdated);
                    refreshButton.disabled = !refreshEnabled;
                    if (!refreshEnabled) {
                        refreshButton.innerHTML = `
                            <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"></path>
                            </svg>
                            5秒内只能刷新一次
                        `;
                    }
                } else {
                    // 首次使用，提示刷新数据
                    showAlert('未找到用户数据，请点击刷新按钮从区块链获取', 'success');
                    refreshButton.disabled = false;
                }
            } catch (error) {
                console.error('获取用户数据错误:', error);
                showAlert('获取用户数据失败');
            } finally {
                loadingStats.classList.add('hidden');
                statsContent.classList.remove('hidden');
            }
        }

        // 显示用户数据
        function displayUserData(userData) {
            // 显示推荐人（优先显示手动设置的推荐人）
            const effectiveReferrer = getEffectiveReferrer(userData);
            
            if (effectiveReferrer) {
                referredByElement.textContent = formatAddress(effectiveReferrer);
                referredByElement.title = effectiveReferrer;
                
                // 如果是手动设置的推荐人，显示"手动"标签
                if (userData.manualReferredBy) {
                    manualReferrerTag.classList.remove('hidden');
                    autoReferrerTag.classList.add('hidden');
                } else {
                    manualReferrerTag.classList.add('hidden');
                    autoReferrerTag.classList.remove('hidden');
                }
            } else {
                referredByElement.textContent = '无推荐人';
                manualReferrerTag.classList.add('hidden');
                autoReferrerTag.classList.add('hidden');
            }
            
            // 更新当前用户数据
            currentUserData = userData;
            
            // 根据可见性状态显示直接推荐人数
            updateDirectReferralsVisibility();
            
            // 根据可见性状态显示组织总人数
            updateOrgTotalVisibility();
            
            // 显示最后更新时间
            lastUpdatedElement.textContent = `最后更新时间: ${formatDate(userData.lastUpdated)}`;
            
            // 显示直接推荐的地址（带分页）
            if (userData.downlines && userData.downlines.length > 0) {
                // 重置为第一页
                downlinesCurrentPage = 1;
                updatePagination('downlines', userData.downlines, downlinesCurrentPage);
            } else {
                downlinesContainer.innerHTML = '<p>暂无直接推荐的地址</p>';
                downlinesPaginationInfo.classList.add('hidden');
                downlinesPagination.classList.add('hidden');
            }
            
            // 显示手动添加的推荐地址（带分页）
            if (userData.manualDownlines && userData.manualDownlines.length > 0) {
                manualDownlinesContainer.classList.remove('hidden');
                // 重置为第一页
                manualDownlinesCurrentPage = 1;
                updatePagination('manualDownlines', userData.manualDownlines, manualDownlinesCurrentPage);
            } else {
                manualDownlinesContainer.classList.add('hidden');
                manualDownlinesPaginationInfo.classList.add('hidden');
                manualDownlinesPagination.classList.add('hidden');
            }
            
            // 显示手动添加人数
            if (userData.manualReferrals && userData.manualReferrals > 0) {
                manualReferralsContainer.classList.remove('hidden');
                manualReferralsElement.textContent = `${userData.manualReferrals} 人`;
            } else {
                manualReferralsContainer.classList.add('hidden');
            }
        }

        // 获取代币转账记录
        async function fetchTokenTransfers(address) {
            try {
                const apiUrl = `${POLYGON_API_URL}?module=account&action=tokentx&contractaddress=${TOKEN_ADDRESS}&address=${address}&sort=asc&apikey=${POLYGON_API_KEY}`;
                
                const response = await fetch(apiUrl);
                const data = await response.json();
                
                if (data.status === '1') {
                    return data.result.map(tx => ({
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        value: tx.value,
                        timestamp: parseInt(tx.timeStamp) * 1000 // 转换为毫秒
                    }));
                } else {
                    console.error('Polygon API 错误:', data.message);
                    return [];
                }
            } catch (error) {
                console.error('获取代币转账记录错误:', error);
                return [];
            }
        }

        // 查找最早的推荐人
        function findEarliestReferrer(transfers, wallet) {
            let earliestReferrer = null;
            let earliestTimestamp = Infinity;
            
            // 查找最早的转账记录（6个代币）
            for (const transfer of transfers) {
                if (transfer.from.toLowerCase() === wallet.toLowerCase() && 
                    transfer.value === "6000000000000000000") { // 6 tokens with 18 decimals
                    if (transfer.timestamp < earliestTimestamp) {
                        earliestReferrer = transfer.to.toLowerCase();
                        earliestTimestamp = transfer.timestamp;
                    }
                }
            }
            
            return { referrer: earliestReferrer, timestamp: earliestTimestamp !== Infinity ? earliestTimestamp : null };
        }

        // 刷新区块链数据
        async function refreshBlockchainData(wallet) {
            try {
                refreshButton.disabled = true;
                refreshButton.innerHTML = `
                    <div class="spinner"></div>
                    刷新中...
                `;
                
                // 检查现有数据的最后更新时间
                if (currentUserData && currentUserData.lastUpdated) {
                    const refreshEnabled = canRefreshData(currentUserData.lastUpdated);
                    if (!refreshEnabled) {
                        showAlert('5秒内只能刷新一次');
                        refreshButton.innerHTML = `
                            <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"></path>
                            </svg>
                            5秒内只能刷新一次
                        `;
                        return;
                    }
                }
                
                // 从区块链获取转账数据
                const transfers = await fetchTokenTransfers(wallet);
                
                // 分析转账数据，确定推荐关系
                const { referrer: earliestReferrer, timestamp: referrerTimestamp } = findEarliestReferrer(transfers, wallet);
                
                // 查找直接推荐（向你转入6个代币的地址）
                const directDownlines = [];
                for (const transfer of transfers) {
                    if (transfer.to.toLowerCase() === wallet.toLowerCase() && 
                        transfer.value === "6000000000000000000" && // 6 tokens with 18 decimals
                        !directDownlines.includes(transfer.from.toLowerCase())) {
                        directDownlines.push(transfer.from.toLowerCase());
                    }
                }
                
                // 从 Firebase 获取现有数据
                const userRef = db.collection('users').doc(wallet.toLowerCase());
                const doc = await userRef.get();
                
                let userData = {
                    wallet: wallet.toLowerCase(),
                    directReferrals: directDownlines.length,
                    downlines: directDownlines,
                    lastUpdated: new Date().toISOString()
                };
                
                // 如果用户已存在，保留手动添加的推荐数、手动添加的推荐地址和手动设置的推荐人
                if (doc.exists) {
                    const existingData = doc.data();
                    userData.manualReferrals = existingData.manualReferrals || 0;
                    userData.manualDownlines = existingData.manualDownlines || [];
                    userData.manualReferredBy = existingData.manualReferredBy || null;
                    userData.referrerTimestamp = existingData.referrerTimestamp || null;
                    
                    // 处理推荐人逻辑
                    // 1. 如果有手动设置的推荐人，优先使用
                    if (userData.manualReferredBy) {
                        userData.referredBy = existingData.referredBy || null;
                    } 
                    // 2. 如果没有手动设置的推荐人，检查是否需要更新自动推荐人
                    else {
                        // 如果找到了新的推荐人，或者找到的推荐人比现有的更早
                        if (earliestReferrer && 
                            (!existingData.referredBy || 
                             !existingData.referrerTimestamp || 
                             referrerTimestamp < existingData.referrerTimestamp)) {
                            
                            // 如果有旧的推荐人，需要从旧推荐人的下线中移除当前用户
                            if (existingData.referredBy && existingData.referredBy !== earliestReferrer) {
                                await updateReferrerDownlines(existingData.referredBy, wallet, false);
                            }
                            
                            // 更新为新的推荐人
                            userData.referredBy = earliestReferrer;
                            userData.referrerTimestamp = referrerTimestamp;
                            
                            // 将当前用户添加到新推荐人的下线中
                            await updateReferrerDownlines(earliestReferrer, wallet, true);
                            
                            showAlert(`已更新为更早的推荐人: ${formatAddress(earliestReferrer)}`, 'success');
                        } else {
                            // 保持现有推荐人
                            userData.referredBy = existingData.referredBy;
                            userData.referrerTimestamp = existingData.referrerTimestamp;
                        }
                    }
                    
                    // 保留现有的组织总人数，避免刷新时闪烁
                    userData.orgTotal = existingData.orgTotal || 0;
                } else {
                    // 新用户
                    userData.manualReferrals = 0;
                    userData.manualReferredBy = null;
                    userData.manualDownlines = [];
                    userData.orgTotal = 0;
                    userData.referredBy = earliestReferrer;
                    userData.referrerTimestamp = referrerTimestamp;
                    
                    // 如果有推荐人，将当前用户添加到推荐人的下线中
                    if (earliestReferrer) {
                        await updateReferrerDownlines(earliestReferrer, wallet, true);
                    }
                }
                
                // 保存用户数据到 Firebase
                await userRef.set(userData);
                
                // 更新当前用户的组织总人数
                await updateOrgTotalSafe(wallet.toLowerCase(), new Set());
                
                // 如果有推荐人，也更新推荐人的组织总人数
                const effectiveReferrer = getEffectiveReferrer(userData);
                if (effectiveReferrer) {
                    await updateOrgTotalSafe(effectiveReferrer, new Set());
                }
                
                // 重新获取更新后的用户数据
                const updatedDoc = await userRef.get();
                currentUserData = updatedDoc.data();
                
                // 显示更新后的数据
                displayUserData(currentUserData);
                
                showAlert('区块链数据刷新成功', 'success');
            } catch (error) {
                console.error('刷新区块链数据错误:', error);
                showAlert('刷新区块链数据失败: ' + error.message);
            } finally {
                refreshButton.innerHTML = `
                    <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"></path>
                    </svg>
                    刷新区块链数据
                `;
                refreshButton.disabled = false;
            }
        }
        
        // 更新推荐人的下线列表
        async function updateReferrerDownlines(referrerAddress, walletAddress, isAdd) {
            try {
                const referrerRef = db.collection('users').doc(referrerAddress.toLowerCase());
                const referrerDoc = await referrerRef.get();
                
                if (referrerDoc.exists) {
                    const referrerData = referrerDoc.data();
                    let downlines = referrerData.downlines || [];
                    
                    if (isAdd) {
                        // 添加到下线列表
                        if (!downlines.includes(walletAddress.toLowerCase())) {
                            downlines.push(walletAddress.toLowerCase());
                        }
                    } else {
                        // 从下线列表中移除
                        downlines = downlines.filter(address => address.toLowerCase() !== walletAddress.toLowerCase());
                    }
                    
                    // 更新推荐人的下线列表
                    await referrerRef.update({
                        downlines: downlines,
                        directReferrals: downlines.length
                    });
                } else if (isAdd) {
                    // 如果推荐人不存在且需要添加，创建新用户
                    await referrerRef.set({
                        wallet: referrerAddress.toLowerCase(),
                        referredBy: null,
                        manualReferredBy: null,
                        directReferrals: 1,
                        downlines: [walletAddress.toLowerCase()],
                        manualDownlines: [],
                        manualReferrals: 0,
                        orgTotal: 0,
                        lastUpdated: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('更新推荐人下线列表错误:', error);
                throw error;
            }
        }

        // 安全更新组织总人数 - 防止循环引用
        async function updateOrgTotalSafe(wallet, visitedWallets) {
            try {
                // 如果已经访问过这个钱包，跳过以防止循环
                if (visitedWallets.has(wallet.toLowerCase())) {
                    console.log(`检测到循环引用，跳过钱包 ${wallet}`);
                    return 0;
                }
                
                // 添加到已访问集合
                visitedWallets.add(wallet.toLowerCase());
                
                console.log(`开始更新钱包 ${wallet} 的组织总人数`);
                
                // 获取用户数据
                const userRef = db.collection('users').doc(wallet.toLowerCase());
                const doc = await userRef.get();
                
                if (!doc.exists) {
                    console.log(`钱包 ${wallet} 不存在，跳过更新`);
                    return 0;
                }
                
                const userData = doc.data();
                
                // 计算直接下线的组织总人数
                let totalFromDownlines = 0;
                
                // 获取所有直接下线（区块链检测到的）
                if (userData.downlines && userData.downlines.length > 0) {
                    for (const downline of userData.downlines) {
                        // 创建新的访问集合，避免修改原始集合
                        const newVisitedWallets = new Set(visitedWallets);
                        const downlineTotal = await updateOrgTotalSafe(downline.toLowerCase(), newVisitedWallets);
                        totalFromDownlines += downlineTotal;
                    }
                }
                
                // 获取所有手动添加的下线
                if (userData.manualDownlines && userData.manualDownlines.length > 0) {
                    for (const downline of userData.manualDownlines) {
                        // 创建新的访问集合，避免修改原始集合
                        const newVisitedWallets = new Set(visitedWallets);
                        const downlineTotal = await updateOrgTotalSafe(downline.toLowerCase(), newVisitedWallets);
                        totalFromDownlines += downlineTotal;
                    }
                }
                
                // 计算组织总人数 = 直接下线人数 + 下线的组织总人数 + 手动添加人数 + 手动添加的下线数量
                const orgTotal = userData.directReferrals + totalFromDownlines + userData.manualReferrals + (userData.manualDownlines ? userData.manualDownlines.length : 0);
                
                // 使用原子操作更新组织总人数
                await userRef.update({
                    orgTotal: orgTotal
                });
                
                console.log(`钱包 ${wallet} 的组织总人数更新为: ${orgTotal}`);
                
                // 如果有推荐人，递归更新推荐人的组织总人数
                const effectiveReferrer = getEffectiveReferrer(userData);
                if (effectiveReferrer && !visitedWallets.has(effectiveReferrer.toLowerCase())) {
                    // 创建新的访问集合，避免修改原始集合
                    const newVisitedWallets = new Set(visitedWallets);
                    await updateOrgTotalSafe(effectiveReferrer, newVisitedWallets);
                }
                
                return orgTotal;
            } catch (error) {
                console.error(`更新钱包 ${wallet} 的组织总人数错误:`, error);
                return 0;
            }
        }

        // 事件监听器
        // 连接钱包按钮
        connectButton.addEventListener('click', connectMetamask);
        
        // 断开连接按钮
        disconnectButton.addEventListener('click', disconnectWallet);
        
        // 刷新按钮
        refreshButton.addEventListener('click', () => {
            if (currentAccount) {
                refreshBlockchainData(currentAccount);
            }
        });
        
        // 显示/隐藏切换按钮
        toggleDirectReferrals.addEventListener('click', toggleDirectReferralsVisibility);
        toggleOrgTotal.addEventListener('click', toggleOrgTotalVisibility);
        
        // 分页按钮事件
        downlinesPrevPage.addEventListener('click', () => {
            if (downlinesCurrentPage > 1) {
                downlinesCurrentPage--;
                updatePagination('downlines', currentUserData.downlines, downlinesCurrentPage);
            }
        });
        
        downlinesNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil((currentUserData.downlines || []).length / ITEMS_PER_PAGE);
            if (downlinesCurrentPage < totalPages) {
                downlinesCurrentPage++;
                updatePagination('downlines', currentUserData.downlines, downlinesCurrentPage);
            }
        });
        
        manualDownlinesPrevPage.addEventListener('click', () => {
            if (manualDownlinesCurrentPage > 1) {
                manualDownlinesCurrentPage--;
                updatePagination('manualDownlines', currentUserData.manualDownlines, manualDownlinesCurrentPage);
            }
        });
        
        manualDownlinesNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil((currentUserData.manualDownlines || []).length / ITEMS_PER_PAGE);
            if (manualDownlinesCurrentPage < totalPages) {
                manualDownlinesCurrentPage++;
                updatePagination('manualDownlines', currentUserData.manualDownlines, manualDownlinesCurrentPage);
            }
        });
        
        // 检查是否连接了钱包（刷新页面时）
        async function checkConnection() {
            if (window.ethereum) {
                provider = new ethers.providers.Web3Provider(window.ethereum);
                try {
                    const accounts = await provider.listAccounts();
                    if (accounts.length > 0) {
                        currentAccount = accounts[0];
                        
                        // 更新 UI
                        connectedAddress.textContent = currentAccount;
                        connectButton.classList.add('hidden');
                        disconnectButton.classList.remove('hidden');
                        walletNotConnected.classList.add('hidden');
                        walletConnected.classList.remove('hidden');
                        referralDataContainer.classList.remove('hidden');
                        
                        // 获取用户数据
                        await getUserData(currentAccount);
                    }
                } catch (error) {
                    console.error('检查连接错误:', error);
                }
            }
        }
        
        // 页面加载时检查连接
        checkConnection();
        
        // 监听钱包切换
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length === 0) {
                    disconnectWallet();
                } else {
                    currentAccount = accounts[0];
                    
                    // 更新 UI
                    connectedAddress.textContent = currentAccount;
                    
                    // 获取用户数据
                    await getUserData(currentAccount);
                }
            });
        }
        
    } catch (error) {
        console.error('初始化错误:', error);
        showAlert('系统初始化失败: ' + error.message);
    }
});
</script>
