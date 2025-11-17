---
title: Scoop 个人配置
slug: scoop-personal-configuration-21itd6
url: /post/scoop-personal-configuration-21itd6.html
date: '2024-03-24 02:09:34+08:00'
lastmod: '2025-11-17 23:01:53+08:00'
toc: true
isCJKLanguage: true
tags: ["Scoop", "Windows", "配置", "工具"]
---



# Scoop 个人配置

# 下载aria2

​`scoop install aria2`

# 配置aria2

```pwsh
scoop install aria2
scoop config aria2-max-connection-per-server 16
scoop config aria2-split 16
scoop config aria2-min-split-size 1M
```

# 下载git

​`scoop install git`

# 导出

​`scoop export > scoop.json`

# 导入

​`scoop import scoop.json`

# 参考scoop.json

[scoop.json](assets/scoop-20240324021741-mbhju4o.json)

# 参考scoop list

```pwsh
7zip                          24.08                main       2024-09-01 14:34:35
adb                           35.0.2               main       2024-10-22 17:19:58
alist                         3.39.1               main       2024-11-03 22:12:08
anaconda3                     2024.10-1            extras     2024-10-25 13:22:07
anki                          24.06.3              scoop-cn   2024-07-08 12:25:33
another-redis-desktop-manager 1.6.8                extras     2024-10-22 17:20:25
aria2                         1.37.0-1             main       2024-04-16 17:09:41
bruno                         1.34.2               extras     2024-11-06 11:52:20
cacert                        2024-09-24           main       2024-09-24 22:10:55
cloudflared                   2024.11.0            main       2024-11-07 11:16:26
cmake                         3.31.0               main       2024-11-08 12:07:37
curl                          8.11.0_1             main       2024-11-07 11:16:35
cwrsync                       6.3.2                main       2024-11-04 17:00:53
dark                          3.14                 main       2024-04-16 17:54:10
dart                          3.5.4                main       2024-10-22 17:21:18
devpod                        0.5.22               dorado     2024-11-06 11:50:26
docker-compose                2.30.3               main       2024-11-08 12:07:48
dockercompletion              1.2600.0.240409      scoop-cn   2024-04-16 17:42:35
dotnet-sdk                    8.0.403              main       2024-10-10 13:22:09
dotnet2-sdk                   2.1.818              versions   2024-04-16 17:32:21
dotnet3-sdk                   3.1.426              versions   2024-04-16 17:32:38
dotnet5-sdk                   5.0.408              versions   2024-04-16 17:32:58
dotnet6-sdk                   6.0.427              versions   2024-10-10 13:22:40
draw.io                       24.7.17              scoop-cn   2024-10-10 13:04:07
everything                    1.4.1.1026           scoop-cn   2024-09-01 14:39:59
ffmpeg                        7.1                  main       2024-10-10 13:05:06
fluent-reader                 1.1.4                extras     2024-09-20 21:05:38
flutter                       3.24.4               scoop-cn   2024-10-25 13:21:13
fzf                           0.56.0               main       2024-10-28 14:29:05
gcc                           13.2.0               main       2024-04-16 17:34:16
gifski                        1.32.0               main       2024-04-26 15:56:39
git                           2.47.0.2             main       2024-10-25 19:21:29
github                        3.4.9                extras     2024-11-07 11:17:15
glow                          2.0.0                main       2024-09-24 22:11:07
go                            1.23.3               main       2024-11-07 11:18:06
gpg                           2.4.6                main       2024-11-01 14:17:25
gradle                        8.10.2               main       2024-09-24 22:13:48
graphviz                      12.2.0               main       2024-11-04 17:01:03
grep                          3.11                 main       2024-04-16 17:54:12
grpcurl                       1.9.1                main       2024-07-17 21:15:14
Hack-NF                       3.2.1                nerd-fonts 2024-04-16 18:46:14
Hack-NF-Mono                  3.2.1                nerd-fonts 2024-04-16 18:46:21
Hack-NF-Propo                 3.2.1                nerd-fonts 2024-04-16 18:46:28
haskell                       9.10.1               main       2024-05-15 13:26:39
Hasklig-NF                    3.2.1                nerd-fonts 2024-09-20 21:06:23
Hasklig-NF-Mono               3.2.1                nerd-fonts 2024-09-20 21:06:37
Hasklig-NF-Propo              3.2.1                nerd-fonts 2024-09-20 21:06:48
helix                         24.07                main       2024-07-15 20:05:03
helm                          3.16.2               main       2024-10-10 13:23:07
innounp                       1.76                 main       2024-11-06 11:50:35
kitty                         0.76.1.13            scoop-cn   2024-04-16 17:54:36
kompose                       1.34.0               main       2024-06-03 11:56:03
koodo-reader                  1.7.1                dorado     2024-10-28 14:29:23
kubens                        0.9.5                main       2024-04-16 17:54:46
kubeshark                     52.3.88              main       2024-11-03 22:12:21
lazydocker                    0.23.3               main       2024-05-27 11:51:33
lazygit                       0.44.1               scoop-cn   2024-09-20 20:48:21
localsend                     1.16.1               scoop-cn   2024-11-06 11:52:29
lua                           5.4.7-2              main       2024-09-01 14:47:49
lunarvim                      1.3.0                scoop-cn   2024-04-16 17:57:58
LXGWNeoXiHei                  1.211                nerd-fonts 2024-10-31 11:23:17
LXGWWenKai                    1.501                nerd-fonts 2024-10-22 17:23:01
LXGWWenKaiMono                1.501                nerd-fonts 2024-10-22 17:23:16
LXGWWenKaiScreen              1.501                nerd-fonts 2024-10-22 17:23:36
Maple-Mono                    6.4                  nerd-fonts 2024-04-16 18:30:16
Maple-Mono-autohint           6.4                  nerd-fonts 2024-04-16 18:30:20
Maple-Mono-NF                 6.4                  nerd-fonts 2024-04-16 18:30:23
Maple-Mono-otf                6.4                  nerd-fonts 2024-04-16 18:30:25
Maple-Mono-SC-NF              6.4                  nerd-fonts 2024-04-16 18:30:34
memreduct                     3.4                  scoop-cn   2024-04-16 17:58:17
Meslo-NF                      3.2.1                nerd-fonts 2024-04-16 18:45:07
Meslo-NF-Mono                 3.2.1                nerd-fonts 2024-04-16 18:45:27
Meslo-NF-Propo                3.2.1                nerd-fonts 2024-04-16 18:45:37
mingw                         14.2.0-rt_v12-rev0   main       2024-09-20 20:49:20
minikube                      1.34.0               main       2024-09-20 20:49:31
mongodb-compass               1.44.6               scoop-cn   2024-11-01 10:25:52
Motrix                        1.8.19               extras     2024-06-13 09:59:11
neovim                        0.10.2               main       2024-10-10 13:07:40
neovim-qt                     0.2.18               scoop-cn   2024-04-16 17:59:30
nodejs                        23.1.0               main       2024-10-25 17:04:22
nuget                         6.11.1               main       2024-10-10 13:10:47
obsidian                      1.7.5                scoop-cn   2024-11-06 11:49:54
octant                        0.25.1               scoop-cn   2024-04-16 18:03:37
openark                       1.3.6                extras     2024-09-20 21:06:58
openjdk11                     11.0.2-9             java       2024-04-16 18:03:48
openjdk20                     20.0.2-9             java       2024-04-16 18:04:02
openlens                      6.5.2                scoop-cn   2024-04-16 18:04:21
OpenSSL                       3.4.0                main       2024-10-25 17:06:31
optimizer                     16.7                 scoop-cn   2024-09-01 14:50:07
oraclejdk-lts                 21.0.4               java       2024-10-22 17:25:06
pipx                          1.7.1                main       2024-09-20 21:07:02
poetry                        1.8.4                main       2024-10-22 17:25:56
portainer                     1.23.2               main       2024-04-16 18:14:05
posh-git                      1.1.0                scoop-cn   2024-04-16 18:14:06
potplayer                     241015               scoop-cn   2024-10-22 17:26:26
protobuf                      28.3                 extras     2024-10-25 13:22:21
pwsh                          7.4.6                main       2024-10-25 17:24:28
pypy3                         7.3.17               main       2024-09-01 14:51:00
python                        3.13.0               main       2024-10-10 13:15:10
python27                      2.7.18               scoop-cn   2024-04-16 18:15:06
python310                     3.10.11              versions   2024-06-25 20:35:12
python311                     3.11.9               versions   2024-06-25 20:28:59
python39                      3.9.13               versions   2024-09-20 21:07:30
rammap                        1.61                 scoop-cn   2024-04-16 18:15:12
rancher-desktop               1.16.0               scoop-cn   2024-09-20 20:51:42
redis                         7.4.1                main       2024-10-10 13:23:49
rust                          1.82.0               main       2024-10-22 17:28:58
rust-analyzer                 2024-10-28           main       2024-10-29 17:02:01
rustup-msvc                   1.27.1               main       2024-06-26 12:15:44
s3browser                     12.1.5               extras     2024-11-06 11:50:04
scala                         3.5.2                main       2024-10-25 17:06:45
scoop-completion              0.3.0                scoop-cn   2024-04-16 18:17:39
scoop-search                  1.5.0                main       2024-07-11 23:10:49
screentogif                   2.41.1               scoop-cn   2024-09-20 20:55:20
SourceCodePro-NF              3.2.1                nerd-fonts 2024-04-16 18:44:02
SourceCodePro-NF-Mono         3.2.1                nerd-fonts 2024-04-16 18:44:17
SourceCodePro-NF-Propo        3.2.1                nerd-fonts 2024-04-16 18:44:41
starship                      1.21.1               main       2024-10-22 17:29:08
sudo                          0.2020.01.26         main       2024-04-16 18:18:02
sumatrapdf                    3.5.2                scoop-cn   2024-04-16 18:18:06
sunshine                      0.23.1               scoop-cn   2024-04-23 23:10:06
supabase                      1.219.2              main       2024-11-07 21:01:42
telnet                        msys-inetutils-1.7-1 main       2024-04-16 18:19:09
trafficmonitor                1.84.1               extras     2024-09-20 21:07:38
typora                        1.9.5                extras     2024-09-20 21:07:57
typst                         0.12.0               main       2024-10-22 17:29:31
wget                          1.21.4               main       2024-04-16 18:37:35
windows-terminal              1.21.2911.0          extras     2024-10-25 13:22:27
windterm                      2.6.1                scoop-cn   2024-04-16 20:08:53
winfsp-np                     2.0.23075            scoop-cn   2024-04-16 18:34:09
winget                        1.9.25180            main       2024-11-02 11:29:03
wireshark                     4.4.1                extras     2024-10-10 13:24:29
yasm                          1.3.0                main       2024-04-16 18:37:53
git                           2.47.0.2             main       2024-10-25 19:21:58 Global install
```

# 参考命令

```pwsh
scoop install 7zip adb alist anki aria2 cacert clash-verge-rev cmake curl cwrsync dark dart docker-compose dockercompletion dotnet-sdk dotnet2-sdk dotnet3-sdk dotnet5-sdk dotnet6-sdk draw.io ffmpeg flameshot fluent-terminal-np flutter gcc gifski git github go gradle graphviz grep haskell helix helm innounp kitty kompose kubens kubeshark lazydocker lazygit localsend lua lunarvim LXGWWenKai LXGWWenKaiMono LXGWWenKaiScreen memreduct mingw minikube mongodb-compass neovim neovim-qt nodejs nuget obsidian octant openjdk11 openjdk20 openlens OpenSSL oraclejdk-lts poetry portainer posh-git postman potplayer protobuf pwsh pypy3 python python27 rammap rancher-desktop redis rust rust-analyzer scala scoop-completion scoop-search screentogif starship sudo sumatrapdf sunshine tabby telnet typora typst wget windterm winfsp-np winget git
```
