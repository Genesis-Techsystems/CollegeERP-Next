import { Component, OnInit } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';

@Component({
  selector: 'app-exam-dashboard',
  templateUrl: './exam-dashboard.component.html',
  styleUrls: ['./exam-dashboard.component.scss'],
  animations : fuseAnimations
})
export class ExamDashboardComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
