import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Connectome } from './connectome';

// TODO: re-enable when Zone-powered harness is in place
xdescribe('Connectome', () => {
  let component: Connectome;
  let fixture: ComponentFixture<Connectome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Connectome],
    }).compileComponents();

    fixture = TestBed.createComponent(Connectome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
