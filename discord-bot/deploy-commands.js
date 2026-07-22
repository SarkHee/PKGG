require('dotenv').config()
const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js')

const commands = [
  new SlashCommandBuilder()
    .setName('전적')
    .setDescription('PUBG 플레이어 전적을 조회합니다')
    .addStringOption((opt) =>
      opt.setName('닉네임').setDescription('조회할 플레이어 닉네임').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('플랫폼')
        .setDescription('플랫폼 직접 지정 (미입력 시 자동감지)')
        .setRequired(false)
        .addChoices(
          { name: '🎮 Steam', value: 'steam' },
          { name: '🟡 카카오', value: 'kakao' },
        )
    ),

  new SlashCommandBuilder()
    .setName('클랜')
    .setDescription('PUBG 클랜 정보를 조회합니다')
    .addStringOption((opt) =>
      opt.setName('클랜명').setDescription('조회할 클랜명').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('서버상태')
    .setDescription('PUBG 서버 현재 상태를 확인합니다'),

  new SlashCommandBuilder()
    .setName('뉴스채널')
    .setDescription('PUBG 공식 뉴스 자동 알림 채널 관리')
    .addSubcommand((sub) =>
      sub
        .setName('설정')
        .setDescription('뉴스 알림을 받을 채널을 설정합니다')
        .addChannelOption((opt) =>
          opt
            .setName('채널')
            .setDescription('알림을 받을 텍스트 채널')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('해제')
        .setDescription('채널의 뉴스 알림을 해제합니다')
        .addChannelOption((opt) =>
          opt
            .setName('채널')
            .setDescription('알림을 해제할 채널')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('목록').setDescription('현재 설정된 뉴스 알림 채널 목록을 확인합니다')
    ),

  new SlashCommandBuilder()
    .setName('뉴스체커상태')
    .setDescription('뉴스 자동 체크의 마지막 실행 시각/결과와 다음 실행 예정 시각을 확인합니다'),

  new SlashCommandBuilder()
    .setName('이번주무기티어')
    .setDescription('최근 7일간 킬수 기준 무기 TOP5 순위를 확인합니다')
    .addStringOption((opt) =>
      opt
        .setName('플랫폼')
        .setDescription('플랫폼 필터 (미입력 시 전체)')
        .setRequired(false)
        .addChoices(
          { name: '🎮 Steam', value: 'steam' },
          { name: '🟡 카카오', value: 'kakao' },
        )
    ),

  new SlashCommandBuilder()
    .setName('무기티어채널')
    .setDescription('매주 월요일 무기 티어 자동 발행 채널 관리')
    .addSubcommand((sub) =>
      sub
        .setName('설정')
        .setDescription('무기 티어를 매주 자동으로 받을 채널을 설정합니다')
        .addChannelOption((opt) =>
          opt
            .setName('채널')
            .setDescription('알림을 받을 텍스트 채널')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('해제')
        .setDescription('채널의 무기 티어 자동 발행을 해제합니다')
        .addChannelOption((opt) =>
          opt
            .setName('채널')
            .setDescription('알림을 해제할 채널')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('목록').setDescription('현재 설정된 무기 티어 발행 채널 목록을 확인합니다')
    ),

  new SlashCommandBuilder()
    .setName('스쿼드예약')
    .setDescription('스쿼드 모집 게시글을 올립니다 (실행한 사람이 주최자가 됩니다)')
    .addStringOption((opt) =>
      opt.setName('시간').setDescription('진행 예정 시간 (예: 오늘 21시)').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName('인원').setDescription('총 모집 인원 (본인 포함)').setRequired(true).setMinValue(2).setMaxValue(10)
    ),
].map((cmd) => cmd.toJSON())

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN)

;(async () => {
  try {
    console.log('슬래시 커맨드 등록 중...')
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands })
    console.log('✅ 슬래시 커맨드 등록 완료!')
    console.log('  /전적, /클랜, /서버상태, /뉴스채널 (설정·해제·목록), /뉴스체커상태, /이번주무기티어, /무기티어채널 (설정·해제·목록), /스쿼드예약')
  } catch (err) {
    console.error('오류:', err)
  }
})()
