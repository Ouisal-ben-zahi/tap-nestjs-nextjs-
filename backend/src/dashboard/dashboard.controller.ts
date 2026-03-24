import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { DashboardService, type ApplyJobPayload, type RecruiterJobPayload, type RecruiterMatchByOfferPayload, type RecruiterValidateCandidatePayload, type RecruiterSaveInterviewPdfPayload } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}


  // === JWT-based routes (no userId in URL) ===

  @Get('candidat/stats')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateStatsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateStats(userId);
  }

  @Get('candidat/score-json')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateScoreByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateScoreFromJsonByUser(userId);
  }

  @Get('candidat/portfolio')
  @UseGuards(AuthGuard('jwt'))
  async getCandidatePortfolioByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidatePortfolio(userId);
  }

  @Get('candidat/applications')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateApplicationsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateApplications(userId);
  }

  @Get('candidat/profile')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateProfileByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateProfileByUser(userId);
  }

  @Put('candidat/profile')
  @UseGuards(AuthGuard('jwt'))
  async updateCandidateProfileByJwt(@Req() req: any, @Body() body: Record<string, any>) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.updateCandidateProfileByUser(userId, body);
  }

  @Get('candidat/cv-files')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateCvFilesByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateCvFiles(userId);
  }

  @Get('candidat/talentcard-files')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateTalentcardFilesByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidateTalentcardFiles(userId);
  }

  @Get('candidat/portfolio-pdf-files')
  @UseGuards(AuthGuard('jwt'))
  async getCandidatePortfolioPdfFilesByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getCandidatePortfolioPdfFiles(userId);
  }

  @Post('candidat/generate-portfolio-long')
  @UseGuards(AuthGuard('jwt'))
  async generateCandidatePortfolioLongByJwt(
    @Req() req: any,
    @Body() body: { lang?: 'fr' | 'en' },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.generateCandidatePortfolioLong(userId, body?.lang);
  }

  // === Portfolio long flow (chatbot → scoring → generation) ===

  @Post('candidat/portfolio-long/start')
  @UseGuards(AuthGuard('jwt'))
  async startCandidatePortfolioLongChatByJwt(
    @Req() req: any,
    @Body() body: { lang?: 'fr' | 'en' },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).startCandidatePortfolioLongChat(userId, body?.lang);
  }

  @Post('candidat/portfolio-long/:sessionId/message')
  @UseGuards(AuthGuard('jwt'))
  async sendCandidatePortfolioLongChatMessageByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).sendCandidatePortfolioLongChatMessage(userId, sessionId, body?.message);
  }

  @Get('candidat/portfolio-long/:sessionId/state')
  @UseGuards(AuthGuard('jwt'))
  async getCandidatePortfolioLongChatStateByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).getCandidatePortfolioLongChatState(userId, sessionId);
  }

  @Post('candidat/portfolio-long/run')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(202)
  async runCandidatePortfolioLongPipelineByJwt(
    @Req() req: any,
    @Body() body: { lang?: 'fr' | 'en' },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).runCandidatePortfolioLongPipeline(userId, body?.lang);
  }

  @Post('candidat/interview/start')
  @UseGuards(AuthGuard('jwt'))
  async startCandidateInterviewSimulationByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).startCandidateInterviewSimulation(userId);
  }

  @Get('candidat/interview/:sessionId/status')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateInterviewSimulationStatusByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).getCandidateInterviewSimulationStatus(userId, sessionId);
  }

  @Get('candidat/interview/:sessionId/audio')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateInterviewSimulationAudioByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).getCandidateInterviewSimulationAudio(userId, sessionId);
  }

  @Post('candidat/interview/:sessionId/record')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('audio'))
  async sendCandidateInterviewSimulationAudioByJwt(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @UploadedFile() audio: any,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return (this.dashboardService as any).sendCandidateInterviewSimulationAudio(userId, sessionId, audio);
  }

  @Post('candidat/upload-cv')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'img_file', maxCount: 1 },
    ]),
  )
  async uploadCandidateCvByJwt(
    @Req() req: any,
    @UploadedFiles()
    files: { file?: any[]; img_file?: any[] },
    @Body() body: Record<string, any>,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const cvFile = files?.file?.[0];
    const imgFile = files?.img_file?.[0];
    return this.dashboardService.uploadCandidateCv(userId, cvFile, {
      onboarding: body,
      imgFile,
    });
  }

  @Post('candidat/check-cv-photo')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async checkCandidateCvPhotoByJwt(
    @Req() req: any,
    @UploadedFile() file: any,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.checkCvHasPhoto(userId, file);
  }

  @Delete("candidat/cv-file")
  @UseGuards(AuthGuard("jwt"))
  async deleteCandidateCvFileByJwt(@Req() req: any, @Query("path") path: string) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    await this.dashboardService.deleteCandidateCvFile(userId, path);
    return { success: true };
  
  }

  @Delete("candidat/talentcard-file")
  @UseGuards(AuthGuard("jwt"))
  async deleteCandidateTalentcardFileByJwt(
    @Req() req: any,
    @Query("path") path: string,
  ) {
    await this.dashboardService.deleteCandidateTalentcardFile(req.user.sub, path);
    return { success: true };
  }

  @Delete("candidat/portfolio-pdf-file")
  @UseGuards(AuthGuard("jwt"))
  async deleteCandidatePortfolioPdfFileByJwt(
    @Req() req: any,
    @Query("path") path: string,
  ) {
    await this.dashboardService.deleteCandidatePortfolioPdfFile(req.user.sub, path);
    return { success: true };
  }


  @Get('recruteur/jobs')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterJobsByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getRecruiterJobsWithCounts(userId);
  }

  @Post('recruteur/jobs')
  @UseGuards(AuthGuard('jwt'))
  async createRecruiterJobByJwt(@Req() req: any, @Body() body: RecruiterJobPayload) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.createRecruiterJob(userId, body);
  }

  @Get('recruteur/overview')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterOverviewByJwt(@Req() req: any) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getRecruiterOverview(userId);
  }

  @Post('recruteur/jobs/:jobId/status')
  @UseGuards(AuthGuard('jwt'))
  async updateRecruiterJobStatusByJwt(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() body: { status: 'ACTIVE' | 'INACTIVE' },
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    const id = Number.parseInt(jobId, 10);
    return this.dashboardService.updateRecruiterJobStatus(
      userId,
      id,
      body.status,
    );
  }

  @Post('recruteur/match-by-offre')
  @UseGuards(AuthGuard('jwt'))
  async getRecruiterMatchedCandidatesByOfferByJwt(
    @Req() req: any,
    @Body() body: RecruiterMatchByOfferPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.getRecruiterMatchedCandidatesByOffer(userId, body);
  }

  @Post('recruteur/candidatures/validate')
  @UseGuards(AuthGuard('jwt'))
  async validateRecruiterCandidateByJwt(
    @Req() req: any,
    @Body() body: RecruiterValidateCandidatePayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.validateCandidateApplication(userId, body);
  }

  @Post('recruteur/interview-questions/save-pdf')
  @UseGuards(AuthGuard('jwt'))
  async saveRecruiterInterviewQuestionsPdfByJwt(
    @Req() req: any,
    @Body() body: RecruiterSaveInterviewPdfPayload,
  ) {
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.saveInterviewQuestionsPdf(userId, body);
  }

  // === Legacy routes with userId in URL ===

  @Get('candidat/user/:userId')
  async getCandidateDashboard(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidateStats(id);
  }

  @Get('candidat/user/:userId/portfolio')
  async getCandidatePortfolio(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidatePortfolio(id);
  }

  @Get('candidat/user/:userId/applications')
  async getCandidateApplications(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidateApplications(id);
  }

  @Get('candidat/user/:userId/cv-files')
  async getCandidateCvFiles(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidateCvFiles(id);
  }

  @Get('candidat/user/:userId/talentcard-files')
  async getCandidateTalentcardFiles(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidateTalentcardFiles(id);
  }

  @Get('candidat/user/:userId/portfolio-pdf-files')
  async getCandidatePortfolioPdfFiles(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getCandidatePortfolioPdfFiles(id);
  }

  // === Versions basées sur candidateId directement ===

  @Get('candidat-id/:candidateId/cv-files')
  async getCandidateCvFilesByCandidateId(
    @Param('candidateId') candidateId: string,
  ) {
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getCandidateCvFilesByCandidateId(id);
  }

  @Get('candidat-id/:candidateId/talentcard-files')
  async getCandidateTalentcardFilesByCandidateId(
    @Param('candidateId') candidateId: string,
  ) {
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getCandidateTalentcardFilesByCandidateId(id);
  }

  @Get('candidat-id/:candidateId/score-json')
  async getCandidateScoreFromJson(@Param('candidateId') candidateId: string) {
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getCandidateScoreFromJson(id);
  }

  @Get('candidat-id/:candidateId/portfolio-pdf-files')
  async getCandidatePortfolioPdfFilesByCandidateId(
    @Param('candidateId') candidateId: string,
  ) {
    const id = Number.parseInt(candidateId, 10);
    return this.dashboardService.getCandidatePortfolioPdfFilesByCandidateId(id);
  }

  @Post('candidat/user/:userId/upload-cv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCandidateCv(
    @Param('userId') userId: string,
    @UploadedFile() file: any,
  ) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.uploadCandidateCv(id, file);
  }

  @Post('recruteur/:userId/jobs')
  async createRecruiterJob(
    @Param('userId') userId: string,
    @Body() body: RecruiterJobPayload,
  ) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.createRecruiterJob(id, body);
  }

  @Get('recruteur/:userId/jobs')
  async getRecruiterJobs(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getRecruiterJobsWithCounts(id);
  }

  @Get('recruteur/:userId/overview')
  async getRecruiterOverview(@Param('userId') userId: string) {
    const id = Number.parseInt(userId, 10);
    return this.dashboardService.getRecruiterOverview(id);
  }

  // Offres visibles côté candidat (liste globale des jobs)
  @Get('jobs')
  async getAllJobsForCandidates() {
    return this.dashboardService.getAllJobsForCandidates();
  }

  // Offres recommandées côté candidat (matching IA par embeddings)
  @Get('candidat/matching-jobs')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateMatchingJobsByJwt(@Req() req: any) {
    try {
      return await this.dashboardService.getCandidateMatchingJobs(req?.user);
    } catch {
      return { jobs: [] };
    }
  }

  @Get('candidat/debug-identity')
  @UseGuards(AuthGuard('jwt'))
  async getCandidateDebugIdentityByJwt(@Req() req: any) {
    return this.dashboardService.debugCandidateIdentity(req?.user);
  }

  // Candidature à une offre (candidat)
  @Post('candidat/apply-job')
  @UseGuards(AuthGuard('jwt'))
  async applyJobByJwt(@Req() req: any, @Body() body: ApplyJobPayload) {
    // ApplyJobPayload inclut jobId + chemins de fichiers + lien
    const userId = await this.dashboardService.resolveJwtUserId(req?.user);
    return this.dashboardService.applyToJob(userId, body);
  }
}

