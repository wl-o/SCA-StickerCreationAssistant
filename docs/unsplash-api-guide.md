# Unsplash API Key 申请教程

SCA 默认用 [Unsplash](https://unsplash.com/) 搜无版权配图。需要先申请 **Access Key**（以及可选的 Application ID / Secret），再填到软件「设置 → 配图图库」。

> Key 只保存在你本机 SQLite，不会上传到本仓库或任何第三方服务器。

## 一、注册 / 登录 Unsplash Developers

1. 打开官方开发者平台：[https://unsplash.com/developers](https://unsplash.com/developers)
2. 使用已有 Unsplash 账号登录；没有账号先注册
3. 进入后点击 **Your apps**（或 **New Application**）

## 二、创建应用（Application）

1. 点击 **New Application**
2. 勾选并同意 API 使用条款（Accept terms）
3. 填写应用信息，例如：
   - **Application name**：`SCA Sticker Creation Assistant`（可自定）
   - **Description**：简要说明用于个人内容创作工具的配图检索
4. 创建成功后进入应用详情页

## 三、复制密钥

在应用详情页可以看到：

| 字段 | 说明 | 是否必填 |
|------|------|----------|
| **Access Key** | 搜图、下载接口鉴权用 | **必填** |
| **Application ID** | 应用标识 | 建议填写 |
| **Secret Key** | 部分高级能力用 | 一般可留空 |

请把 **Access Key**（以及 Application ID）复制好，不要发到公开群 / GitHub Issue。

## 四、填进 SCA

1. 打开 SCA（网页版或桌面版）
2. 左侧进入 **设置**
3. 找到 **配图图库**，选择 **Unsplash**
4. 粘贴：
   - Unsplash Application ID
   - Unsplash Access Key
   - （可选）Unsplash Secret Key
5. 保存后，到「创作结果 / 改写 / 内容库」里即可搜图配图

## 五、常见问题

### 1. 搜图失败 / 401

- Access Key 是否粘贴完整（前后无空格）
- 是否选了 Unsplash 而不是 Pexels / Pixabay
- Demo 应用有请求配额限制，频率过高会被限流

### 2. 只有 Demo 权限够不够用？

个人本地创作一般够用。若以后用量很大，再按 Unsplash 指引申请正式 Production 权限。

### 3. 不想用 Unsplash？

可在设置里改用 **Pexels** 或 **Pixabay**，同样在对应官网申请 API Key 后填入即可：

- Pexels：[https://www.pexels.com/api/](https://www.pexels.com/api/)
- Pixabay：[https://pixabay.com/api/docs/](https://pixabay.com/api/docs/)

## 参考链接

- Unsplash Developers 首页：https://unsplash.com/developers
- Unsplash API 文档：https://unsplash.com/documentation
